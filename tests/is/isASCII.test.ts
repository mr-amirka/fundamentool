import { isASCII } from '../../src/is/isASCII';

describe('isASCII', () => {
  test('returns true for pure ASCII strings', () => {
    expect(isASCII('hello')).toBe(true);
    expect(isASCII('Hello World')).toBe(true);
    expect(isASCII('abc123')).toBe(true);
    expect(isASCII('!@#$%')).toBe(true);
  });

  test('returns false for strings with non-ASCII characters', () => {
    expect(isASCII('привет')).toBe(false);
    expect(isASCII('café')).toBe(false);
    expect(isASCII('日本語')).toBe(false);
  });

  test('returns false for empty string, null, undefined', () => {
    expect(isASCII('')).toBe(false);
    expect(isASCII(null)).toBe(false);
    expect(isASCII(undefined)).toBe(false);
  });
});
