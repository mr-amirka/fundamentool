import { extend } from '../src/extend';

describe('extend', () => {
  test('copies own enumerable properties from src to dst', () => {
    const dst = { a: 1 };
    const src = { b: 2, c: 3 };
    const result = extend(dst, src);
    expect(result).toBe(dst);
    expect(dst).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('overwrites existing keys in dst', () => {
    const dst = { a: 1, b: 0 };
    extend(dst, { b: 2 });
    expect(dst.b).toBe(2);
  });

  test('returns dst when src is empty', () => {
    const dst = { a: 1 };
    expect(extend(dst, {})).toBe(dst);
  });
});
