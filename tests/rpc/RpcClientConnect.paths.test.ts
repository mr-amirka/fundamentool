/**
 * `RpcClient` ↔ `RpcConnect` over an in-memory channel — every path: subscriptions, the proxy, timeouts and abort
 * signals (reaching the server task's signal), dispatches, callbacks both ways, a task gone, messages not for this end,
 * unknown ones, plain (non-serializable) mode.
 */
import {
  RpcClient,
} from '../../src/rpc/RpcClient';
import {
  RpcConnect,
} from '../../src/rpc/RpcConnect';
import {
  RpcCoder,
} from '../../src/rpc/RpcCoder';
import {
  TRpcAgent,
  TRpcType,
} from '../../src/rpc/types';
import {
  makeChannel,
} from './_channel';

/** Lets the channel's promises and timers settle. */
const flush = (ms = 0) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

/** A client and a server over one channel; `sent` — what the client posted. */
function pair(
  exports: Record<string, any>, clientExtra: Record<string, unknown> = {}, connectExtra: Record<string, unknown> = {},
) {
  const {
    clientOptions, serverOptions,
  } = makeChannel();
  const sent: any[] = [];
  const connect = new RpcConnect({
    ...serverOptions,
    exports,
    ...connectExtra,
  });
  const client = new RpcClient({
    ...clientOptions,
    postMessage: (message: any) => {
      sent.push(message);
      return clientOptions.postMessage(message);
    },
    ...clientExtra,
  });
  return {
    client,
    connect,
    sent,
    clientOptions,
    serverOptions,
  };
}

describe('RpcClient ↔ RpcConnect — every path', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
  });

  it('options as a function; a nested method keeps its object as `this`; a missing method lists the exports', async () => {
    const math = {
      base: () => 10,
      add(n: number): number {
        return this.base() + n;
      },
    };
    const {
      clientOptions, serverOptions,
    } = makeChannel();
    const connect = new RpcConnect(() => ({
      ...serverOptions,
      exports: {
        math,
      } as never, // nested exports: resolved by path ('math.add'), not in the exports' type
    }));
    const client = new RpcClient(() => clientOptions);
    await expect(client.call('math.add', [5])).resolves.toBe(15);
    await expect(client.call('nope')).rejects.toThrow('Method "nope" is not exist. All methods: math and their subfields');
    expect(client.taskCount()).toBe(0);
    client.destroy();
    connect.destroy();
  });

  it('a server error keeps its name and code', async () => {
    const {
      client,
    } = pair({
      fail: () => {
        const failure = new Error('denied');
        failure.name = 'AccessError';
        (failure as any).code = 403;
        throw failure;
      },
    });
    const failure = await client.call('fail').catch((caught) => caught);
    expect(failure.message).toBe('fail: AccessError: denied'); // the method's path and the original, as the server wraps it
    expect(failure.name).toBe('AccessError');
    expect(failure.code).toBe(403);
  });

  it('a subscription: the server calls back while it lasts; unsubscribing ends it and runs the server\'s cleanup', async () => {
    let stopped = false;
    let emit: (value: number) => void = () => undefined;
    const {
      client,
    } = pair({
      ticks: (onTick: (value: number) => void) => {
        emit = onTick;
        onTick(1);
        return () => {
          stopped = true;
        };
      },
      once: () => 'no cleanup',
    });
    const seen: number[] = [];
    const unsubscribe = client.on('ticks', [(value: number) => seen.push(value)]);
    await flush();
    emit(2);
    await flush();
    expect(seen).toEqual([
      1,
      2,
    ]);
    unsubscribe();
    await flush();
    expect(stopped).toBe(true);
    expect(client.taskCount()).toBe(0);
    const other = client.on(
      'once', [], {},
    );
    other();
    await flush();
    expect(client.taskCount()).toBe(0);
  });

  it('the proxy: the exports as functions; one proxy until terminated; terminate runs the server\'s own', async () => {
    let terminated = 0;
    const {
      client,
    } = pair({
      add: (a: number, b: number) => a + b,
      terminate: () => {
        terminated++;
      },
    });
    const first = client.proxy();
    expect(client.proxy()).toBe(first);
    const api = await first;
    await expect(api.add(2, 3)).resolves.toBe(5);
    await api.terminate();
    await flush();
    expect(terminated).toBe(1);
    expect(client.proxy()).not.toBe(first);

    const plain = pair({
      add: (a: number, b: number) => a + b,
    });
    const proxy = await plain.client.proxy();
    await proxy.terminate(); // nothing of the server's to run
    await flush();
    expect(plain.client.taskCount()).toBe(0);
  });

  it('a timeout rejects with AbortError and aborts the server task\'s signal', async () => {
    const aborted: string[] = [];
    let signal: EventTarget | undefined;
    const {
      client, connect,
    } = pair({
      slow: () => new Promise((resolve) => {
        setTimeout(resolve, 60);
      }),
    }, {
      timeout: 10,
    });
    // The server task's signal: what the client's events reach
    const tasks = (connect as any).slotTaskMap as Map<string, any>;
    const call = client.call(
      'slow', [], {},
    ).catch((caught) => caught);
    await flush();
    signal = [...tasks.values()][0][0].signal;
    signal?.addEventListener('abort', () => aborted.push('abort'));
    const failure = await call;
    expect(failure.name).toBe('AbortError');
    expect(failure.code).toBe(20);
    expect(failure.message).toBe('slow: The method execution timeout has been reached');
    expect(aborted).toEqual(['abort']);
    expect((signal as any).aborted).toBe(true);
    await flush(70);
  });

  it('an AbortSignal and the events asked for reach the server task\'s signal, with their detail', async () => {
    const heard: unknown[] = [];
    const {
      client, connect,
    } = pair({
      slow: () => new Promise((resolve) => {
        setTimeout(resolve, 40);
      }),
    });
    const controller = new AbortController();
    const call = client.call(
      'slow', [], {
        signal: controller.signal,
        events: ['pause'],
      },
    ).catch((caught) => caught);
    await flush();
    const task = [...((connect as any).slotTaskMap as Map<string, any>).values()][0];
    task[0].signal.addEventListener('pause', (event: CustomEvent) => heard.push(event.detail));
    controller.signal.dispatchEvent(new CustomEvent('pause', {
      detail: {
        reason: 'busy',
      },
    }));
    await flush();
    expect(heard).toEqual([
      {
        reason: 'busy',
      },
    ]);
    controller.abort();
    const failure = await call;
    expect(failure.message).toBe('slow: The method execution was aborted');
    await flush(50);
    // An event for a task the server no longer holds changes nothing
    (connect as any).handleMessage([
      TRpcAgent.Client,
      [
        TRpcType.Event,
        'gone',
        'abort',
        undefined,
      ],
    ]);
  });

  it('dispatches reach the client\'s subscribers — serializable and plain', async () => {
    const {
      client, connect,
    } = pair({});
    const seen: unknown[] = [];
    client.subscribe((data: unknown) => seen.push(data));
    connect.dispatch({
      at: new Date(0),
    });
    await flush();
    expect(seen).toEqual([
      {
        at: new Date(0),
      },
    ]);

    const plain = pair(
      {
        add: (a: number, b: number) => a + b,
      }, {
        serializable: false,
      }, {
        serializable: false,
      },
    );
    const raw: unknown[] = [];
    plain.client.subscribe((data: unknown) => raw.push(data));
    plain.connect.dispatchEncoded([
      1,
      2,
    ] as never);
    await flush();
    expect(raw).toEqual([
      [
        1,
        2,
      ],
    ]);
    await expect(plain.client.call('add', [
      1,
      2,
    ])).resolves.toBe(3);
  });

  it('callbacks both ways; a callback that throws rejects on the other side', async () => {
    const {
      client,
    } = pair({
      ask: async (question: (text: string) => Promise<string>) => {
        try {
          return await question('name?');
        } catch (caught: any) {
          return 'failed: ' + caught.message;
        }
      },
      handOver: async (take: (counter: () => number) => Promise<void>) => {
        let count = 0;
        await take(() => ++count); // a server function, given to the client's callback
      },
    });
    await expect(client.call('ask', [async (text: string) => `answer to ${text}`])).resolves.toBe('answer to name?');
    await expect(client.call('ask', [
      () => {
        throw new Error('no');
      },
    ])).resolves.toBe('failed: no');
    let counter: (() => Promise<number>) | undefined;
    await client.call('handOver', [
      async (given: () => Promise<number>) => {
        counter = given;
        await expect(given()).resolves.toBe(1); // while the call lasts
      },
    ]);
    // The call is over: the client no longer holds its task
    await expect(counter?.()).rejects.toThrow('Client: Terminated task');
  });

  it('a server function that throws rejects in the client; plain mode: a signal without events, a sub-call carried as is', async () => {
    const {
      client,
    } = pair({
      handOver: async (take: (fail: () => never) => Promise<void>) => {
        await take(() => {
          throw new Error('server says no');
        });
      },
    });
    let caught: any;
    await client.call('handOver', [
      async (fail: () => Promise<never>) => {
        caught = await fail().catch((failure) => failure);
      },
    ]);
    expect(caught.message).toBe('server says no');

    const plain = pair(
      {
        slow: () => new Promise((resolve) => {
          setTimeout(resolve, 30);
        }),
      }, {
        serializable: false,
      }, {
        serializable: false,
      },
    );
    const controller = new AbortController();
    const call = plain.client.call(
      'slow', [], {
        signal: controller.signal,
      },
    ).catch((failure) => failure);
    await flush();
    const requestId = plain.sent[0][1][1];
    controller.abort();
    expect((await call).name).toBe('AbortError');
    expect(plain.sent[1][1]).toEqual([
      TRpcType.Event,
      requestId,
      'abort',
      undefined,
    ]);
    // A sub-call for a live task in plain mode: nothing to invoke, the answer carried as is
    const live = plain.client.call('slow');
    await flush();
    const liveId = plain.sent[plain.sent.length - 1][1][1];
    await (plain.client as any).handleMessage([
      TRpcAgent.Server,
      [
        TRpcType.SubCall,
        liveId,
        0,
        0,
      ],
    ]);
    expect(plain.sent[plain.sent.length - 1][1]).toEqual([
      TRpcType.SubResult,
      liveId,
      0,
      0,
      undefined,
    ]);
    await live;
  });

  it('a server task gone: its callback rejects; a sub-result or sub-call for it is answered or ignored', async () => {
    let later: (() => Promise<unknown>) | undefined;
    const {
      client, connect, clientOptions,
    } = pair({
      keep: (callback: () => Promise<unknown>) => {
        later = callback;
        return 'kept';
      },
    });
    await client.call('keep', [() => 'x']);
    await expect(later?.()).rejects.toThrow('Connect: Terminated task');
    const replies: any[] = [];
    clientOptions.onMessage((message: any) => replies.push(message));
    const handle = (message: any) => (connect as any).handleMessage(message);
    await handle([
      TRpcAgent.Client,
      [
        TRpcType.SubCall,
        'gone',
        0,
        0,
        [],
      ],
    ]);
    expect(replies[0][1][0]).toBe(TRpcType.SubResult);
    expect(replies[0][1][3]).toBe(1);
    expect((new RpcCoder()).decode(replies[0][1][4]).message).toBe('Connect: Terminated task');
    await handle([
      TRpcAgent.Client,
      [
        TRpcType.SubResult,
        'gone',
        0,
        0,
        null,
      ],
    ]);
  });

  it('the server: a message not from a client is ignored; an unknown meta method and an unknown type are reported', async () => {
    const {
      connect, clientOptions,
    } = pair({});
    const replies: any[] = [];
    clientOptions.onMessage((message: any) => replies.push(message));
    const handle = (message: any) => (connect as any).handleMessage(message);
    await handle([
      TRpcAgent.Server,
      [
        TRpcType.Call,
        'x',
        'a',
        [],
      ],
    ]);
    expect(replies).toEqual([]);
    await handle([
      TRpcAgent.Client,
      [
        TRpcType.MetaCall,
        'meta',
        'nope',
        [],
      ],
    ]);
    expect(warn).toHaveBeenCalledWith('Connect: Unknown meta method', expect.anything());
    expect((new RpcCoder()).decode(replies[0][1][3]).message).toBe('Connect: Unknown meta method: nope');
    await handle([
      TRpcAgent.Client,
      [
        99,
        'x',
      ],
    ]);
    expect(warn).toHaveBeenCalledWith('Connect: Unknown client message', expect.anything());
  });

  it('the client: a message not from a server is ignored; unknown types are reported; a sub-call for a gone task is answered', async () => {
    const {
      client, connect, sent,
    } = pair({
      slow: () => new Promise((resolve) => {
        setTimeout(resolve, 30);
      }),
    });
    const handle = (message: any) => (client as any).handleMessage(message);
    await handle([
      TRpcAgent.Client,
      [
        TRpcType.Result,
        'x',
      ],
    ]);
    const call = client.call('slow');
    await flush();
    const requestId = sent[sent.length - 1][1][1];
    await handle([
      TRpcAgent.Server,
      [
        TRpcType.Event,
        requestId,
      ],
    ]);
    expect(warn).toHaveBeenCalledWith('Client: Unknown server message', expect.anything());
    // A sub-result for a sub-call it never made
    await handle([
      TRpcAgent.Server,
      [
        TRpcType.SubResult,
        requestId,
        999,
        0,
        null,
      ],
    ]);
    await call;
    // Messages for a task it no longer holds: a sub-call is answered with an error, the rest ignored
    const before = sent.length;
    await handle([
      TRpcAgent.Server,
      [
        TRpcType.SubCall,
        'gone',
        0,
        0,
        (new RpcCoder()).encode([1]),
      ],
    ]);
    await handle([
      TRpcAgent.Server,
      [
        TRpcType.Result,
        'gone',
        0,
        null,
      ],
    ]);
    expect(sent.length).toBe(before + 1);
    expect(sent[before][1][0]).toBe(TRpcType.SubResult);
    expect(error).toHaveBeenCalledWith(
      'Client:Call:SubCall', expect.any(Error), expect.anything(),
    );
    connect.destroy();

    const plain = pair(
      {}, {
        serializable: false,
      }, {
        serializable: false,
      },
    );
    await (plain.client as any).handleMessage([
      TRpcAgent.Server,
      [
        TRpcType.SubCall,
        'gone',
        0,
        0,
      ],
    ]);
    expect(plain.sent[0][1][4]).toBeInstanceOf(Error);
  });
});
