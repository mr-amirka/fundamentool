import { promisify } from '../src/promisify';

describe('promisify', () => {
  test('resolves with callback result on success', async () => {
    const fn = (cb: (err: any, val: string) => void) => cb(null, 'hello');
    const wrapped = promisify(fn);
    await expect(wrapped()).resolves.toBe('hello');
  });

  test('rejects with callback error', async () => {
    const err = new Error('fail');
    const fn = (cb: (err: any, val?: string) => void) => cb(err);
    const wrapped = promisify(fn);
    await expect(wrapped()).rejects.toBe(err);
  });

  test('forwards arguments to original function', async () => {
    const fn = (a: number, b: number, cb: (err: any, val: number) => void) => cb(null, a + b);
    const wrapped = promisify(fn);
    await expect(wrapped(2, 3)).resolves.toBe(5);
  });

  test('preserves this context', async () => {
    const obj = {
      value: 42,
      fn(cb: (err: any, val: number) => void) {
        cb(null, this.value);
      },
    };
    const wrapped = promisify(obj.fn);
    await expect(wrapped.call(obj)).resolves.toBe(42);
  });

  test('uses custom Promise constructor when provided', async () => {
    const fn = (cb: (err: any, val: string) => void) => cb(null, 'custom');
    const wrapped = promisify(fn, Promise);
    await expect(wrapped()).resolves.toBe('custom');
  });
});
