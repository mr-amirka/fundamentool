import { isHash } from '../../src/is/isHash';

describe('isHash', () => {
  test('returns true for valid 32-char hex string (default)', () => {
    expect(isHash('a'.repeat(32))).toBe(true);
    expect(isHash('0123456789abcdef'.repeat(2))).toBe(true);
  });

  test('returns true for valid hex string of custom length', () => {
    expect(isHash('abc123', 6)).toBe(true);
    expect(isHash('ff', 2)).toBe(true);
  });

  test('returns false for non-hex characters', () => {
    expect(isHash('xyz' + 'a'.repeat(29))).toBe(false);
    expect(isHash('XYZ', 3)).toBe(false);
  });

  test('returns false for wrong length', () => {
    expect(isHash('abc', 32)).toBe(false);
    expect(isHash('a'.repeat(33))).toBe(false);
  });

  test('returns false for non-string values', () => {
    expect(isHash(null)).toBe(false);
    expect(isHash(undefined)).toBe(false);
    expect(isHash(123)).toBe(false);
  });
});
