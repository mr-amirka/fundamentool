import { isSafeNumber } from '../../src/is/isSafeNumber';

describe('isSafeNumber', () => {
  test('returns true for valid non-negative numbers', () => {
    expect(isSafeNumber(0)).toBe(true);
    expect(isSafeNumber(100)).toBe(true);
    expect(isSafeNumber('3.14')).toBe(true);
    expect(isSafeNumber(2147483646)).toBe(true);
  });

  test('returns false for negative numbers', () => {
    expect(isSafeNumber(-1)).toBe(false);
  });

  test('returns false for numbers equal to or exceeding MAX_SAFE_NUMBER', () => {
    expect(isSafeNumber(2147483647)).toBe(false);
  });

  test('returns false for NaN / non-parseable values', () => {
    expect(isSafeNumber(NaN)).toBe(false);
    expect(isSafeNumber('abc')).toBe(false);
    expect(isSafeNumber(null)).toBe(false);
  });
});
