import { sendingQueue } from '../src/sendingQueue';

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
    const promise = new Promise<void>((r) => { resolve = r; });
    const fn = jest.fn().mockReturnValue(promise);
    const send = sendingQueue(fn);
    send();
    const drained = send.drain();
    (resolve as () => void)();
    await drained;
    expect(fn).toHaveBeenCalled();
  });
});
