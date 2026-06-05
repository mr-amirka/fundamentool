import { without } from '../src/without';

describe('without', () => {
  test('excludes given keys from object', () => {
    const src = { a: 1, b: 2, c: 3 };
    const result = without(src, ['b']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  test('excludes multiple keys', () => {
    const src = { a: 1, b: 2, c: 3 };
    const result = without(src, ['a', 'c']);
    expect(result).toEqual({ b: 2 });
  });

  test('returns copy; does not mutate src', () => {
    const src = { a: 1, b: 2 };
    const result = without(src, ['b']);
    expect(src).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(src);
  });

  test('writes into dst when provided', () => {
    const src = { a: 1, b: 2 };
    const dst: Record<string, number> = {};
    const result = without(src, ['b'], dst);
    expect(result).toBe(dst);
    expect(dst).toEqual({ a: 1 });
  });

  test('keeps all keys when withoutKeys is empty', () => {
    const src = { a: 1, b: 2 };
    expect(without(src, [])).toEqual(src);
  });
});
