import { curry } from '../src/curry';

describe('curry', () => {
  test('calls function when all args provided at once', () => {
    const add = curry((a: number, b: number) => a + b);
    expect((add as any)(2, 3)).toBe(5);
  });

  test('partially applies arguments', () => {
    const add = curry((a: number, b: number) => a + b);
    const add5 = (add as any)(5);
    expect(add5(3)).toBe(8);
  });

  test('supports multi-step currying', () => {
    const sum = curry((a: number, b: number, c: number) => a + b + c);
    expect((sum as any)(1)(2)(3)).toBe(6);
    expect((sum as any)(1, 2)(3)).toBe(6);
    expect((sum as any)(1)(2, 3)).toBe(6);
  });

  test('returns function (not final result) when partial args provided', () => {
    const add = curry((a: number, b: number) => a + b);
    const partial = (add as any)(1);
    expect(typeof partial).toBe('function');
  });

  test('handles zero-argument functions', () => {
    const fn = curry(() => 42);
    expect((fn as any)()).toBe(42);
  });
});
