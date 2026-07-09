import {
  isArray, 
} from '../src/is/isArray';

describe('isArray', () => {
  test('returns true for arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2])).toBe(true);
  });

  test('returns false for non-arrays', () => {
    expect(isArray(null)).toBe(false);
    expect(isArray({})).toBe(false);
    expect(isArray('')).toBe(false);
    expect(isArray(0)).toBe(false);
  });
});
