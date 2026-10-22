/**
 * `wsSeriesRequestProvider` — every path over a fake socket: answers in order, a dropped answer (`onMessage` false), a
 * broken message, a connection lost (the waiting answer rejects, the app's `onReconnect`, the rest sent again).
 */
import {
  wsSeriesRequestProvider,
} from '../../src/browser/wsSeriesRequestProvider';
import {
  FakeWebSocket,
} from './wsFakeWebSocket';

const flush = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};

const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

const answer = (socket: FakeWebSocket, response: unknown) => socket.onmessage?.({
  data: new Blob([JSON.stringify(response)]),
});

describe('browser/wsSeriesRequestProvider — every path', () => {
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

  it('answers in order; one kept by onMessage; a broken message to onError; requests while connected are sent at once', async () => {
    const errors: unknown[] = [];
    let keep = false;
    const request = wsSeriesRequestProvider('ws://x', {
      onMessage: () => (keep ? false : undefined),
      onError: (error) => errors.push(error),
    });
    const first = request('a');
    last().onopen?.();
    await flush();
    const second = request('b'); // connected: sent at once
    expect(last().sent).toHaveLength(2);
    answer(last(), {
      n: 1,
    });
    await expect(first).resolves.toEqual({
      n: 1,
    });
    keep = true;
    answer(last(), {
      n: 'kept',
    });
    await flush();
    keep = false;
    answer(last(), {
      n: 2,
    });
    await expect(second).resolves.toEqual({
      n: 2,
    });
    last().onmessage?.({
      data: new Blob(['not json']),
    });
    await flush();
    expect(errors[0]).toBeInstanceOf(SyntaxError);
  });

  it('a lost connection rejects the answer waited for, reconnects after onReconnect, and sends what waits', async () => {
    const errors: unknown[] = [];
    const onReconnect = jest.fn(() => Promise.resolve());
    const request = wsSeriesRequestProvider('ws://x', {
      onReconnect,
      onError: (error) => errors.push(error),
    });
    const waited = request('a');
    const queued = request('b'); // waits for the connection
    const first = last();
    first.onopen?.();
    await flush();
    expect(first.sent).toHaveLength(1);
    const lost = new Error('lost');
    first.onclose?.(lost);
    await expect(waited).rejects.toBe(lost);
    expect(errors).toEqual([lost]);
    await flush();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    const second = last();
    expect(second).not.toBe(first);
    second.onopen?.();
    await flush();
    expect(second.sent).toHaveLength(1);
    answer(second, {
      ok: true,
    });
    await expect(queued).resolves.toEqual({
      ok: true,
    });
  });

  it('the default onReconnect waits 10 s', async () => {
    jest.useFakeTimers();
    try {
      const request = wsSeriesRequestProvider('ws://x');
      void request('a').catch(() => undefined);
      last().onerror?.(new Error('refused'));
      const sockets = FakeWebSocket.instances.length;
      await jest.advanceTimersByTimeAsync(9999);
      expect(FakeWebSocket.instances.length).toBe(sockets);
      await jest.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances.length).toBe(sockets + 1);
    } finally {
      jest.useRealTimers();
    }
  });
});
