import {
  sendingQueue,
} from '../src/sendingQueue';

describe('sendingQueue', () => {
  test('returns function that queues calls', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const send = sendingQueue(fn);
    send();
    send();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('drain waits for all pending', async () => {
    let resolve: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    const fn = jest.fn().mockReturnValue(promise);
    const send = sendingQueue(fn);
    send();
    const drained = send.drain();
    (resolve as () => void)();
    await drained;
    expect(fn).toHaveBeenCalled();
  });
});

describe('sendingQueue — a failed send', () => {
  it('drain with nothing in flight resolves', async () => {
    await expect(sendingQueue(() => Promise.resolve()).drain()).resolves.toBeUndefined();
  });

  it('the only send in flight fails: drain rejects with it, the next send too — and nothing rejects unheard', async () => {
    const failure = new Error('offline');
    const send = sendingQueue((() => Promise.reject(failure)) as (row: string) => Promise<void>);
    await expect(send('a')).resolves.toBeUndefined(); // nothing ahead of it: no waiting
    await expect(send.drain()).rejects.toBe(failure);
    await expect(send('b')).rejects.toBe(failure);
  });

  it('a send behind a failing one rejects with that failure', async () => {
    const failure = new Error('offline');
    let fail: (error: Error) => void = () => undefined;
    const send = sendingQueue((row: string) => row === 'a'
      ? new Promise<void>((_resolve, reject) => {
        fail = reject;
      })
      : Promise.resolve());
    const first = send('a');
    const second = send('b'); // waits behind 'a'
    fail(failure);
    await expect(first).resolves.toBeUndefined();
    await expect(second).rejects.toBe(failure);
    await expect(send.drain()).rejects.toBe(failure);
  });
});
