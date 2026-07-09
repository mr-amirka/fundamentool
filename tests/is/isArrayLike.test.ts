import {
  isArrayLike, 
} from '../../src/is/isArrayLike';

describe('isArrayLike', () => {
  test('returns true for arrays', () => {
    expect(isArrayLike([])).toBe(true);
    expect(isArrayLike([
      1,
      2,
      3,
    ])).toBe(true);
  });

  test('returns true for objects with valid numeric length', () => {
    expect(isArrayLike({
      length: 0, 
    })).toBe(true);
    expect(isArrayLike({
      length: 3, 
    })).toBe(true);
  });

  test('returns false for strings (not an object)', () => {
    expect(isArrayLike('hello')).toBe(false);
  });

  test('returns falsy for null/undefined/primitives', () => {
    expect(isArrayLike(null)).toBeFalsy();
    expect(isArrayLike(undefined)).toBeFalsy();
    expect(isArrayLike(42)).toBeFalsy();
  });

  test('returns false for objects with invalid length', () => {
    expect(isArrayLike({
      length: -1, 
    })).toBe(false);
    expect(isArrayLike({
      length: 1.5, 
    })).toBe(false);
  });
});
