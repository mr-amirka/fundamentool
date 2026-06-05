import { withoutEmpty, withoutEmptyBase } from '../src/withoutEmpty';

describe('withoutEmpty', () => {
  test('returns null for null/undefined/empty string', () => {
    expect(withoutEmpty(null)).toBeNull();
    expect(withoutEmpty(undefined)).toBeNull();
    expect(withoutEmpty("")).toBeNull();
  });

  test('returns scalars as-is', () => {
    expect(withoutEmpty(0)).toBe(0);
    expect(withoutEmpty(42)).toBe(42);
    expect(withoutEmpty('hello')).toBe('hello');
  });

  test('returns null for empty array', () => {
    expect(withoutEmpty([])).toBeNull();
  });

  test('returns array as-is when non-empty', () => {
    expect(withoutEmpty([1, 2])).toEqual([1, 2]);
  });

  test('strips null/undefined/empty values from object at depth 1', () => {
    const src = { a: 1, b: null, c: '', d: undefined, e: 0 };
    const result = withoutEmpty(src, 1);
    expect(result).toEqual({ a: 1, e: 0 });
  });

  test('nested object: withoutEmptyBase with depth recurses', () => {
    const src = { outer: { inner: null, keep: 1 } };
    const result = withoutEmptyBase(src, 2);
    expect(result).toEqual({ outer: { keep: 1 } });
  });
});
