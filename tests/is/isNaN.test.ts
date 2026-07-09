import {
  isNaN, 
} from '../../src/is/isNaN';

describe('isNaN', () => {
  test('returns true for NaN', () => {
    expect(isNaN(NaN)).toBe(true);
    expect(isNaN(Number.NaN)).toBe(true);
  });

  test('returns false for numbers', () => {
    expect(isNaN(0)).toBe(false);
    expect(isNaN(1)).toBe(false);
    expect(isNaN(Infinity)).toBe(false);
  });

  test('returns false for non-numbers (unlike global isNaN)', () => {
    expect(isNaN(undefined)).toBe(false);
    expect(isNaN('abc')).toBe(false);
    expect(isNaN(null)).toBe(false);
  });
});
