import { isIndex } from '../../src/is/isIndex';

describe('isIndex', () => {
  test('returns true for non-negative integer strings', () => {
    expect(isIndex('0')).toBe(true);
    expect(isIndex('42')).toBe(true);
    expect(isIndex('100')).toBe(true);
  });

  test('returns true for numbers coerced to digit strings', () => {
    expect(isIndex(0)).toBe(true);
    expect(isIndex(10)).toBe(true);
  });

  test('returns false for negative or decimal strings', () => {
    expect(isIndex('-1')).toBe(false);
    expect(isIndex('1.5')).toBe(false);
  });

  test('returns false for non-numeric strings', () => {
    expect(isIndex('abc')).toBe(false);
    expect(isIndex('')).toBe(false);
  });
});
