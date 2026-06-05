import { once } from '../src/once';

describe('once', () => {
  test('calls function only on first invocation', () => {
    let count = 0;
    const fn = once(() => { count++; return count; });
    fn();
    fn();
    fn();
    expect(count).toBe(1);
  });

  test('always returns the result of the first call', () => {
    const fn = once(() => 42);
    expect(fn()).toBe(42);
    expect(fn()).toBe(42);
  });

  test('passes arguments to wrapped function on first call', () => {
    const fn = once((a: number, b: number) => a + b);
    expect(fn(2, 3)).toBe(5);
    expect(fn(10, 20)).toBe(5);
  });

  test('returns undefined when function returns undefined', () => {
    const fn = once(() => undefined);
    expect(fn()).toBeUndefined();
    expect(fn()).toBeUndefined();
  });
});
