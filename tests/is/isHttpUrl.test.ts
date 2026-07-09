import {
  isHttpUrl, 
} from '../../src/is/isHttpUrl';

describe('isHttpUrl', () => {
  test('returns true for valid HTTP/HTTPS URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('https://sub.domain.co.uk/path')).toBe(true);
  });

  test('returns false for non-URLs', () => {
    expect(isHttpUrl('not-a-url')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  test('returns false for non-string values', () => {
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl(42)).toBe(false);
  });
});
