import {
  isObject, 
} from '../src/is/isObject';

describe('isObject', () => {
  test('returns true for objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({
      a: 1, 
    })).toBe(true);
  });

  test('returns false for null and primitives', () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject(1)).toBe(false);
    expect(isObject('')).toBe(false);
  });

  test('returns true for arrays', () => {
    expect(isObject([])).toBe(true);
  });
});
