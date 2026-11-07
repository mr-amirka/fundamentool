/**
 * RPC over a WebSocket (fundamentool D-104): `mn-utils`'s example over a real `ws` server; a session that outlasts its
 * socket — a call waits through a drop, what was sent meanwhile is sent then; the addresses taken in turn; a lost or an
 * expired session — "call again"; the client's goodbye; the link's numbering and acks; the options checked.
 */
import {
  WebSocket as WsSocket,
  WebSocketServer,
} from 'ws';
import type {
  AddressInfo,
} from 'net';
import {
  RpcClientWebSocket,
  serveRpcWebSocket,
} from '../../../src/rpc';
import type {
  TRpcWebSocketHost,
} from '../../../src/rpc';
import {
  useCall,
} from '../../../src/rpc/RpcConnect';
import {
  createRpcLink,
  TRpcFrame,
} from '../../../src/rpc/websocket/link';
import {
  wait,
} from '../../../src/wait';

let server: WebSocketServer;
let host: TRpcWebSocketHost | undefined;
const clients: RpcClientWebSocket[] = [];

/** The address of the test's server. */
const address = (): string => `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;

/** An address no one listens on. */
const DEAD = 'ws://127.0.0.1:9';

/** A client that the test ends. */
function client(options: ConstructorParameters<typeof RpcClientWebSocket>[0]): RpcClientWebSocket {
  const made = new RpcClientWebSocket(options);
  clients.push(made);
  return made;
}

/** Waits until the condition holds, up to 3 s. */
async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; tries < 300 && !condition(); tries++) {
    await wait(10);
  }
  expect(condition()).toBe(true);
}

/** Drops every socket of the server at once, as a network does: no closing handshake. */
function dropSockets(): void {
  for (const socket of server.clients) {
    socket.terminate();
  }
}

/** The old example's exports: `log` answers, `info` calls the callback, then fails. */
const EXAMPLE = {
  log: (...args: unknown[]) => `Delivered: ${args.join(' ')}`,
  info: async (text: string, callback: (text: string) => Promise<unknown>) => {
    await callback(`on the server, for ${text}`);
    throw new Error('a mistake!');
  },
};

beforeEach(async () => {
  server = new WebSocketServer({
    port: 0,
    host: '127.0.0.1',
  });
  await new Promise<void>((resolve) => {
    server.once('listening', resolve);
  });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(async () => {
  for (const made of clients.splice(0)) {
    made.destroy();
  }
  host?.close();
  host = undefined;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  jest.restoreAllMocks();
});

describe('RpcClientWebSocket and serveRpcWebSocket', () => {
  it("mn-utils's example: the methods as functions, a callback called by the server, its error crossing", async () => {
    host = serveRpcWebSocket({
      server,
      exports: EXAMPLE,
    });
    const {
      log, info,
    } = await client({
      url: [address()],
    }).proxy();
    await expect(log('Vasya!')).resolves.toBe('Delivered: Vasya!');
    const heard: string[] = [];
    await expect(info('Pupkin!', (text: string) => {
      heard.push(text);
    })).rejects.toThrow('a mistake!');
    expect(heard).toEqual(['on the server, for Pupkin!']);
    expect(host.sessions()).toBe(1);
  });

  it('a call waits through a dropped socket: its answer comes on the next one; one sent meanwhile goes then', async () => {
    let release: () => void = () => undefined;
    host = serveRpcWebSocket({
      server,
      exports: {
        slow: () => new Promise((resolve) => {
          release = () => resolve('slow done');
        }),
        add: (a: number, b: number) => a + b,
      },
    });
    const made = client({
      url: address(),
    });
    await expect(made.call('add', [
      1,
      2,
    ])).resolves.toBe(3);
    const slow = made.call('slow');
    await until(() => server.clients.size === 1);
    await wait(20);
    dropSockets();
    // Sent while no socket is open: kept, and sent on the next one
    const meanwhile = made.call('add', [
      3,
      4,
    ]);
    release();
    await expect(slow).resolves.toBe('slow done');
    await expect(meanwhile).resolves.toBe(7);
    expect(host.sessions()).toBe(1);
  });

  it('the addresses taken in turn: a dead one, then the live one after reconnectMs', async () => {
    host = serveRpcWebSocket({
      server,
      exports: EXAMPLE,
    });
    const made = client({
      url: [
        DEAD,
        address(),
      ],
      reconnectMs: 20,
    });
    await expect(made.call('log', ['twice'])).resolves.toBe('Delivered: twice');
  });

  it('a server that lost the session: the calls waiting reject "call again", proxy() asks again', async () => {
    const forever = {
      never: () => new Promise(() => undefined),
      ...EXAMPLE,
    };
    host = serveRpcWebSocket({
      server,
      exports: forever,
    });
    const made = client({
      url: address(),
    });
    const first = await made.proxy();
    const waiting = made.call('never');
    await until(() => host?.sessions() === 1);
    await wait(20);
    // The host restarts: a new one on the same server knows no session
    host.close();
    host = serveRpcWebSocket({
      server,
      exports: forever,
    });
    await expect(waiting).rejects.toThrow(/lost the session .* call again/);
    const second = await made.proxy();
    expect(second).not.toBe(first);
    await expect(second.log('again')).resolves.toBe('Delivered: again');
  });

  it('a session whose socket stays away sessionMs is forgotten; a goodbye forgets it at once', async () => {
    let down = false;
    // A WebSocket whose network can be cut: while it is, every socket goes to a dead address
    class Flaky extends WsSocket {
      constructor(url: string) {
        super(down ? DEAD : url);
      }
    }
    host = serveRpcWebSocket({
      server,
      exports: {
        never: () => new Promise(() => undefined),
        ...EXAMPLE,
      },
      sessionMs: 50,
    });
    const made = client({
      url: address(),
      reconnectMs: 30,
      WebSocket: Flaky as any,
    });
    const waiting = made.call('never');
    await until(() => host?.sessions() === 1);
    down = true;
    dropSockets();
    await until(() => host?.sessions() === 0);
    down = false;
    await expect(waiting).rejects.toThrow(/lost the session/);
    await expect(made.call('log', ['back'])).resolves.toBe('Delivered: back');
    expect(host.sessions()).toBe(1);
    made.destroy();
    await until(() => host?.sessions() === 0);
  });

  it("dispatchToAll reaches every session's client", async () => {
    host = serveRpcWebSocket({
      server,
      exports: {
        shout: (text: string) => {
          useCall().dispatchToAll(text);
        },
      },
    });
    const one = client({
      url: address(),
    });
    const two = client({
      url: address(),
    });
    await two.call('shout', ['hello']);
    const heard: unknown[] = [];
    one.subscribe((data: unknown) => heard.push([
      'one',
      data,
    ]));
    two.subscribe((data: unknown) => heard.push([
      'two',
      data,
    ]));
    await one.call('shout', ['all']);
    await until(() => heard.length === 2);
    expect(heard).toEqual(expect.arrayContaining([
      [
        'one',
        'all',
      ],
      [
        'two',
        'all',
      ],
    ]));
  });

  it('a socket that sends no hello first is closed; a frame that is no JSON array is skipped', async () => {
    host = serveRpcWebSocket({
      server,
      exports: EXAMPLE,
    });
    const raw = new WsSocket(address());
    await new Promise((resolve) => raw.once('open', resolve));
    raw.send('not json');
    raw.send(JSON.stringify([
      TRpcFrame.Ack,
      0,
    ]));
    await new Promise((resolve) => raw.once('close', resolve));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no JSON array'), 'not json');
    expect(host.sessions()).toBe(0);
  });

  it("a second socket of a session replaces the first; the client skips a server's frame that is no JSON", async () => {
    host = serveRpcWebSocket({
      server,
      exports: EXAMPLE,
    });
    const first = new WsSocket(address());
    await new Promise((resolve) => first.once('open', resolve));
    first.send(JSON.stringify([
      TRpcFrame.Hello,
      null,
      0,
    ]));
    const [welcome] = await new Promise<any[]>((resolve) => first.once('message', (data) => resolve([JSON.parse(String(data))])));
    expect(welcome[0]).toBe(TRpcFrame.Hello);
    const second = new WsSocket(address());
    await new Promise((resolve) => second.once('open', resolve));
    const closed = new Promise((resolve) => first.once('close', resolve));
    second.send(JSON.stringify([
      TRpcFrame.Hello,
      welcome[1],
      0,
    ]));
    await closed;
    expect(host.sessions()).toBe(1);
    second.close();
    // The client's side: a server's frame that is no JSON
    server.once('connection', (socket) => {
      socket.send('{broken');
    });
    const made = client({
      url: address(),
    });
    await expect(made.call('log', ['still'])).resolves.toBe('Delivered: still');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('RpcClientWebSocket'), '{broken');
  });

  it('proxy() fails for good — its timeout, the server away: the client is closed, no socket left trying', async () => {
    let made = 0;
    // A WebSocket that counts the sockets opened
    class Counted extends WsSocket {
      constructor(url: string) {
        made++;
        super(url);
      }
    }
    const lonely = client({
      url: DEAD,
      reconnectMs: 10,
      timeout: 50,
      WebSocket: Counted as any,
    });
    await expect(lonely.proxy()).rejects.toThrow('proxy: The method execution timeout has been reached');
    const after = made;
    await wait(60);
    expect(made).toBe(after);
  });

  it('proxy() of a server that offers nothing to call: the client closed, the host forgets it; a nested one counts', async () => {
    host = serveRpcWebSocket({
      server,
      exports: {
        answer: 42,
      } as any,
    });
    await expect(client({
      url: address(),
    }).proxy()).rejects.toThrow('offers nothing to call');
    await until(() => host?.sessions() === 0);
    host.close();
    host = serveRpcWebSocket({
      server,
      exports: {
        math: {
          add: (a: number, b: number) => a + b,
        },
      } as any,
    });
    const {
      math,
    } = await client({
      url: address(),
    }).proxy();
    await expect(math.add(2, 3)).resolves.toBe(5);
  });

  it('a session lost during the handshake is no failure: proxy() asks again on the next socket', async () => {
    // A first server that welcomes, takes the handshake and drops — a host restarting just then
    server.once('connection', (socket) => {
      socket.once('message', () => {
        socket.send(JSON.stringify([
          TRpcFrame.Hello,
          'gone',
          0,
        ]));
        socket.once('message', () => {
          host = serveRpcWebSocket({
            server,
            exports: EXAMPLE,
          });
          socket.terminate();
        });
      });
    });
    const {
      log,
    } = await client({
      url: address(),
    }).proxy();
    await expect(log('again')).resolves.toBe('Delivered: again');
  });

  it('a client destroyed before its socket opened: the calls reject, no session stays', async () => {
    host = serveRpcWebSocket({
      server,
      exports: EXAMPLE,
    });
    const made = new RpcClientWebSocket({
      url: address(),
    });
    const call = made.call('log', ['never sent']);
    made.destroy(new Error('gone'));
    await expect(call).rejects.toThrow('gone');
    await wait(50);
    expect(host.sessions()).toBe(0);
  });
});

describe('the link', () => {
  it('numbers the messages, sends again what the other end did not get, delivers each once, acks every 32', () => {
    const a = createRpcLink();
    const b = createRpcLink();
    const got: unknown[] = [];
    b.onMessage((message) => got.push(message));
    const unsubscribe = a.onMessage(() => undefined);
    unsubscribe();
    const lost: string[] = [];
    // No socket: kept
    a.postMessage('one');
    a.attach((text) => lost.push(text), 0);
    a.postMessage('two');
    expect(lost.map((text) => JSON.parse(text)[3])).toEqual([
      'one',
      'two',
    ]);
    // The first got there, the second was lost with its socket
    b.receive(JSON.parse(lost[0]));
    a.detach();
    const resent: string[] = [];
    a.attach((text) => resent.push(text), b.received());
    expect(resent.map((text) => JSON.parse(text)[3])).toEqual(['two']);
    // A duplicate is dropped
    b.receive(JSON.parse(resent[0]));
    b.receive(JSON.parse(resent[0]));
    expect(got).toEqual([
      'one',
      'two',
    ]);
    // b hears 32 and says nothing: it acks by a frame of its own, and a trims its outbox
    const acks: string[] = [];
    b.attach((text) => acks.push(text), 0);
    for (let index = 0; index < 32; index++) {
      a.postMessage(index);
    }
    for (const text of resent.splice(1)) {
      b.receive(JSON.parse(text));
    }
    expect(acks.map((text) => JSON.parse(text))).toEqual([
      [
        TRpcFrame.Ack,
        32,
      ],
    ]);
    // The ack trims a's outbox: only the two after it would be sent again
    a.receive(JSON.parse(acks[0]));
    a.detach();
    const after: string[] = [];
    a.attach((text) => after.push(text), 0);
    expect(after.map((text) => JSON.parse(text)[1])).toEqual([
      33,
      34,
    ]);
    a.reset();
    expect(a.received()).toBe(0);
  });
});

describe('the options checked', () => {
  it.each([
    [
      null,
      /options expect an object/,
    ],
    [
      {
        url: 'ws://x',
        retry: 1,
      },
      /retry/,
    ],
    [
      {
        url: [],
      },
      /"url" expects/,
    ],
    [
      {
        url: 'not an address',
      },
      /"url" expects/,
    ],
    [
      {
        url: 'ws://x',
        reconnectMs: -1,
      },
      /"reconnectMs" expects/,
    ],
    [
      {
        url: 'ws://x',
        timeout: 1.5,
      },
      /"timeout" expects/,
    ],
    [
      {
        url: 'ws://x',
        WebSocket: 'ws',
      },
      /"WebSocket" expects a constructor/,
    ],
  ])('the client: %j', (options, error) => {
    expect(() => new RpcClientWebSocket(options as any)).toThrow(error);
  });

  it('the client in a runtime with no global WebSocket: ws is asked for', () => {
    const global = globalThis.WebSocket;
    delete (globalThis as any).WebSocket;
    try {
      expect(() => new RpcClientWebSocket({
        url: 'ws://x',
      })).toThrow(/no global WebSocket/);
    } finally {
      globalThis.WebSocket = global;
    }
  });

  it.each([
    [
      undefined,
      /options expect an object/,
    ],
    [
      {
        server: {},
        exports: {},
      },
      /"server" expects/,
    ],
    [
      {
        server: null,
        exports: {},
      },
      /"server" expects/,
    ],
    [
      {
        exports: null,
      },
      /"exports" expects/,
    ],
    [
      {
        exports: {},
        sessionMs: 0,
      },
      /"sessionMs" expects/,
    ],
    [
      {
        exports: {},
        port: 1,
      },
      /port/,
    ],
  ])('the host: %j', (options, error) => {
    const withServer = options !== undefined && !('server' in options) ? {
      server,
      ...options,
    } : options;
    expect(() => serveRpcWebSocket(withServer as any)).toThrow(error);
  });
});
