/**
 * `wsAsyncRequestProvider` — every path over a fake socket: requests waiting for the connection, an error remembered
 * until the next request, reconnecting (the app's `onReconnect`, its own requests first, its failure), close and reset.
 */
import {
  wsAsyncRequestProvider,
} from '../../src/browser/wsAsyncRequestProvider';
import {
  FakeWebSocket,
} from './wsFakeWebSocket';

/** Lets the promise chains (and the FileReader mock) run. */
const flush = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

/** The last socket made. */
const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

/** What a socket sent, parsed. */
const sentOf = (socket: FakeWebSocket) => socket.sent.map((data) => JSON.parse(data.toString('utf-8')));

/** The server answers the request `id`. */
function answer(socket: FakeWebSocket, response: Record<string, unknown>) {
  socket.onmessage?.({
    data: new Blob([JSON.stringify(response)]),
  });
}

describe('browser/wsAsyncRequestProvider — every path', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    class FileReaderMock {
      public onload: null | (() => void) = null;
      public onerror: null | ((e: any) => void) = null;
      public result: any;
      readAsText(blob: Blob) {
        blob.text().then((text) => {
          this.result = text;
          this.onload?.();
        });
      }
      abort() {}
    }
    (global as any).FileReader = FileReaderMock;
    (global as any).WebSocket = FakeWebSocket;
  });

  it('requests wait for the connection; responses are matched by id; onMessage may keep one; a broken message goes to onError', async () => {
    const opened = jest.fn();
    const errors: unknown[] = [];
    let keep = false;
    let id = 100;
    const request = wsAsyncRequestProvider('ws://x', {
      onSuccessConnect: opened,
      onError: (error) => errors.push(error),
      onMessage: () => (keep ? false : undefined),
      generateIdempotencyKey: () => ++id,
    });
    const first = request('a', 1);
    const second = request('b', 2);
    const socket = last();
    socket.onopen?.();
    await flush();
    expect(opened).toHaveBeenCalledTimes(1);
    expect(sentOf(socket)).toEqual([
      {
        id: 101,
        method: 'a',
        data: 1,
      },
      {
        id: 102,
        method: 'b',
        data: 2,
      },
    ]);
    answer(socket, {
      id: 999,
    }); // nobody waits for it
    answer(socket, {
      id: 101,
      ok: 1,
    });
    await expect(first).resolves.toEqual({
      id: 101,
      ok: 1,
    });
    keep = true;
    answer(socket, {
      id: 102,
    }); // onMessage kept it
    await flush();
    keep = false;
    answer(socket, {
      id: 102,
      ok: 2,
    });
    await expect(second).resolves.toEqual({
      id: 102,
      ok: 2,
    });
    const third = request('c'); // connected: sent at once
    expect(sentOf(socket)[2]).toEqual({
      id: 103,
      method: 'c',
    });
    socket.onmessage?.({
      data: new Blob(['not json']),
    });
    await flush();
    expect(errors[0]).toBeInstanceOf(SyntaxError);
    answer(socket, {
      id: 103,
    });
    await third;
  });

  it('a connection lost with nothing waiting is remembered; the next request reconnects', async () => {
    const request = wsAsyncRequestProvider('ws://x');
    const first = request('a');
    last().onopen?.();
    await flush();
    answer(last(), {
      id: JSON.parse(last().sent[0]).id,
    });
    await first;
    last().onclose?.(new Error('lost'));
    const sockets = FakeWebSocket.instances.length;
    const next = request('b');
    expect(FakeWebSocket.instances.length).toBe(sockets + 1); // reconnecting at once
    last().onopen?.();
    await flush();
    const sent = sentOf(last());
    answer(last(), {
      id: sent[0].id,
      done: true,
    });
    await expect(next).resolves.toMatchObject({
      done: true,
    });
  });

  it('a connection lost while requests wait: onReconnect, then they are sent again on a new socket', async () => {
    const onReconnect = jest.fn(() => Promise.resolve());
    const request = wsAsyncRequestProvider('ws://x', {
      onReconnect,
    });
    const pending = request('a');
    const first = last();
    first.onopen?.();
    await flush();
    const id = sentOf(first)[0].id;
    first.onclose?.(new Error('lost'));
    await flush();
    expect(onReconnect).toHaveBeenCalledWith(expect.any(Error), expect.any(Function));
    const second = last();
    expect(second).not.toBe(first);
    const queued = request('b'); // reconnecting: it waits too
    second.onopen?.();
    await flush();
    expect(sentOf(second).map((message) => message.method)).toEqual([
      'a',
      'b',
    ]);
    answer(second, {
      id,
      again: true,
    });
    await expect(pending).resolves.toMatchObject({
      again: true,
    });
    answer(second, {
      id: sentOf(second)[1].id,
    });
    await queued;
  });

  it('onReconnect failing rejects what waits; the connection failing before it opened reconnects as well', async () => {
    const request = wsAsyncRequestProvider('ws://x', {
      onReconnect: () => {
        throw new Error('give up');
      },
    });
    const pending = request('a');
    last().onerror?.(new Error('refused')); // never opened
    await expect(pending).rejects.toThrow('give up');
  });

  it('onReconnect runs its own requests first (re-auth) over the new socket; then the waiting ones are sent', async () => {
    const run: { call?: (method: string, data?: unknown) => Promise<any> } = {};
    let authed: unknown;
    const request = wsAsyncRequestProvider('ws://x', {
      onReconnect: async (_error, call) => {
        run.call = call;
        authed = await call('auth', 'token');
      },
    });
    const pending = request('a');
    last().onopen?.();
    await flush();
    const mainId = sentOf(last())[0].id;
    last().onclose?.(new Error('lost'));
    await flush();
    const socket = last();
    socket.onopen?.();
    await flush();
    const auth = sentOf(socket)[0];
    expect(auth.method).toBe('auth');
    answer(socket, {
      id: auth.id,
      user: 'u',
    });
    await flush();
    expect(authed).toMatchObject({
      user: 'u',
    });
    expect(sentOf(socket)[1]).toMatchObject({
      id: mainId,
      method: 'a',
    });
    answer(socket, {
      id: mainId,
    });
    await pending;
    await expect(run.call?.('late')).rejects.toThrow('The executor has already returned a result');
    // The new socket lost too: reported, and what waits is sent again on the next one
    const errors: unknown[] = [];
    const again = request('b');
    socket.onclose?.(new Error('lost again'));
    await flush();
    expect(errors).toEqual([]);
    expect(FakeWebSocket.instances.length).toBeGreaterThan(2);
    last().onopen?.();
    await flush();
    answer(last(), {
      id: sentOf(last()).find((message) => message.method === 'auth')?.id,
    });
    await flush();
    answer(last(), {
      id: sentOf(last()).find((message) => message.method === 'b')?.id,
    });
    await again;
  });

  it('onReconnect\'s own requests failing to connect: they reject, and it reconnects again', async () => {
    const results: string[] = [];
    let attempts = 0;
    const request = wsAsyncRequestProvider('ws://x', {
      onReconnect: (_error, call) => {
        attempts++;
        if (attempts === 1) {
          return call('auth').then(() => results.push('ok'), (failure: Error) => results.push(failure.message));
        }
        return undefined;
      },
    });
    const pending = request('a');
    last().onopen?.();
    await flush();
    last().onclose?.(new Error('lost'));
    await flush();
    last().onerror?.(new Error('refused'));
    await flush();
    expect(results).toEqual(['lost']); // its own requests reject with what the reconnect is for
    expect(attempts).toBe(2);
    last().onopen?.();
    await flush();
    answer(last(), {
      id: sentOf(last())[0].id,
    });
    await pending;
  });

  it('the default onReconnect waits 10 s; close rejects what waits and every later request; reset keeps it usable', async () => {
    jest.useFakeTimers();
    try {
      const request = wsAsyncRequestProvider('ws://x', {
        reconnect: true,
      });
      const pending = request('a');
      last().onerror?.(new Error('refused'));
      await jest.advanceTimersByTimeAsync(9999);
      const sockets = FakeWebSocket.instances.length;
      await jest.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances.length).toBe(sockets + 1);
      last().onerror?.(new Error('refused again')); // reconnecting once more: 10 s
      (request as any).close();
      await expect(pending).rejects.toThrow('Connection is closed');
      await jest.advanceTimersByTimeAsync(10000); // the reconnect ends: closed — nothing more
      await expect(request('b')).rejects.toThrow('Connection is closed');
    } finally {
      jest.useRealTimers();
    }
    const usable = wsAsyncRequestProvider('ws://x');
    const first = usable('a');
    last().onopen?.();
    await flush();
    (usable as any).reset();
    const next = usable('b');
    last().onopen?.();
    await flush();
    answer(last(), {
      id: sentOf(last())[0].id,
    });
    await next;
    void first;
  });
});
