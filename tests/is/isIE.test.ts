import { isIE } from '../../src/is/isIE';

describe('isIE', () => {
  test('returns false for modern browser user agents', () => {
    const modernWindow = { navigator: { userAgent: 'Mozilla/5.0 Chrome/120' } };
    expect(isIE(modernWindow)).toBe(false);
  });

  test('returns true for IE user agent containing MSIE', () => {
    const ieWindow = { navigator: { userAgent: 'Mozilla/5.0 MSIE 10.0' } };
    expect(isIE(ieWindow)).toBe(true);
  });

  test('returns true for IE 11 user agent containing Trident', () => {
    const ie11Window = { navigator: { userAgent: 'Mozilla/5.0 Trident/7.0' } };
    expect(isIE(ie11Window)).toBe(true);
  });

  test('returns false when navigator is absent', () => {
    expect(isIE({})).toBe(false);
    expect(isIE({ navigator: null })).toBe(false);
  });
});
