import {
  isPhone, 
} from '../../src/is/isPhone';

describe('isPhone', () => {
  test('returns true for valid Russian phone format', () => {
    expect(isPhone('+7(999)123-45-67')).toBe(true);
    expect(isPhone('+7(000)000-00-00')).toBe(true);
  });

  test('returns false for non-matching formats', () => {
    expect(isPhone('89991234567')).toBe(false);
    expect(isPhone('+7 999 123 45 67')).toBe(false);
    expect(isPhone('+1(999)123-45-67')).toBe(false);
  });

  test('returns false for empty/null/undefined', () => {
    expect(isPhone('')).toBe(false);
    expect(isPhone(null)).toBe(false);
    expect(isPhone(undefined)).toBe(false);
  });
});
