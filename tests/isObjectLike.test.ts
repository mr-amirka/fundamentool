import {
  isObjectLike, 
} from '../src/is/isObjectLike';

describe('isObjectLike', () => {
  test('returns true for objects and functions', () => {
    expect(isObjectLike({})).toBe(true);
    expect(isObjectLike(() => {})).toBe(true);
  });

  test('returns false for primitives and null', () => {
    expect(isObjectLike(null)).toBe(false);
    expect(isObjectLike(undefined)).toBe(false);
    expect(isObjectLike(1)).toBe(false);
    expect(isObjectLike('')).toBe(false);
  });
});
