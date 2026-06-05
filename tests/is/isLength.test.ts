import { isLength } from '../../src/is/isLength';

describe('isLength', () => {
  test('returns true for valid lengths', () => {
    expect(isLength(0)).toBe(true);
    expect(isLength(1)).toBe(true);
    expect(isLength(100)).toBe(true);
    expect(isLength(9007199254740991)).toBe(true);
  });

  test('returns false for negative numbers', () => {
    expect(isLength(-1)).toBe(false);
  });

  test('returns false for decimals', () => {
    expect(isLength(1.5)).toBe(false);
  });

  test('returns false for values exceeding MAX_SAFE_INTEGER', () => {
    expect(isLength(9007199254740992)).toBe(false);
  });

  test('returns false for non-numbers', () => {
    expect(isLength('5')).toBe(false);
    expect(isLength(null)).toBe(false);
    expect(isLength(undefined)).toBe(false);
  });
});
