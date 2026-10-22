import {
  WITH_ASYNC_LOCK_OPTION_KEYS,
  withAsyncLock,
} from '../src/withAsyncLock';
import type {
  TWithAsyncLockOptions,
} from '../src/withAsyncLock';

/** A promise and its resolve, to finish a call when the test says so. */
function deferred<T>(): { promise: Promise<T>;
  resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return {
    promise,
    resolve,
  };
}

describe('withAsyncLock', () => {
  it('ignores calls while one runs (they resolve undefined); after it ends, calls run again', async () => {
    const gate = deferred<string>();
    const fn = jest.fn((_value: number) => gate.promise);
    const locked = withAsyncLock(fn);
    const first = locked(1);
    await expect(locked(2)).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
    gate.resolve('done');
    await expect(first).resolves.toBe('done');
    fn.mockImplementation(async (value: number) => `again ${value}`);
    await expect(locked(3)).resolves.toBe('again 3');
  });

  it('minMs: the lock lasts at least that long from the call\'s start', async () => {
    jest.useFakeTimers();
    try {
      const fn = jest.fn(async () => 'ok');
      const locked = withAsyncLock(fn, {
        minMs: 300,
      });
      await expect(locked()).resolves.toBe('ok'); // the result comes as soon as fn is done
      await jest.advanceTimersByTimeAsync(100);
      await expect(locked()).resolves.toBeUndefined(); // fn has finished, but 300 ms haven't passed
      await jest.advanceTimersByTimeAsync(200);
      await expect(locked()).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('an error releases the lock and reaches the caller', async () => {
    const locked = withAsyncLock(async (fail: boolean) => {
      if (fail) {
        throw new Error('boom');
      }
      return 'fine';
    });
    await expect(locked(true)).rejects.toThrow('boom');
    await expect(locked(false)).resolves.toBe('fine');
  });

  it('works with a synchronous function and keeps `this`', async () => {
    const owner = {
      name: 'owner',
      get: withAsyncLock(function (this: { name: string }) {
        return this.name;
      }),
    };
    await expect(owner.get()).resolves.toBe('owner');
  });

  it.each<[string, () => unknown, RegExp]>([
    [
      'not a function',
      () => withAsyncLock(1 as never),
      /expects a function, got number 1/,
    ],
    [
      'options not an object',
      () => withAsyncLock(async () => 1, 5 as never),
      /expects an options object, got number 5/,
    ],
    [
      'a typo',
      () => withAsyncLock(async () => 1, {
        minMS: 1,
      } as never),
      /unknown option "minMS". Did you mean "minMs"\?/,
    ],
    [
      'minMs negative',
      () => withAsyncLock(async () => 1, {
        minMs: -1,
      }),
      /"minMs" expects a finite number ≥ 0, got number -1/,
    ],
  ])('%s → a clear error', (
    _name, call, message,
  ) => {
    expect(call).toThrow(message);
  });

  it('the key list matches the options type', () => {
    const all: Record<keyof TWithAsyncLockOptions, true> = {
      minMs: true,
    };
    expect([...WITH_ASYNC_LOCK_OPTION_KEYS]).toEqual(Object.keys(all));
  });
});
