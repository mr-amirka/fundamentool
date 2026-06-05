import { isEqual } from '../../src/is/isEqual';

describe('isEqual', () => {
  test('returns true for identical primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual('a', 'a')).toBe(true);
    expect(isEqual(null, null)).toBe(true);
  });

  test('returns false for different primitives', () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('a', 'b')).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
  });

  test('compares shallow object keys at depth 0 (default)', () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('compares nested objects by reference at depth 0', () => {
    expect(isEqual({ a: {} }, { a: {} })).toBe(false);
  });

  test('recurses into nested objects at depth >= 1', () => {
    expect(isEqual({ a: { b: 1 } }, { a: { b: 1 } }, 1)).toBe(true);
    expect(isEqual({ a: { b: 1 } }, { a: { b: 2 } }, 1)).toBe(false);
  });

  test('returns false when key sets differ', () => {
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });
});
