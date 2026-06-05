import { isDocumentStateReady } from '../../src/is/isDocumentStateReady';

const makeWindow = (readyState: string, userAgent = 'Chrome') => ({
  navigator: { userAgent },
  document: { readyState },
});

describe('isDocumentStateReady', () => {
  test('returns true when readyState is "complete"', () => {
    expect(isDocumentStateReady(makeWindow('complete'))).toBe(true);
  });

  test('returns true when readyState is "interactive" in non-IE browsers', () => {
    expect(isDocumentStateReady(makeWindow('interactive'))).toBe(true);
  });

  test('returns false when readyState is "loading"', () => {
    expect(isDocumentStateReady(makeWindow('loading'))).toBe(false);
  });

  test('in IE, returns true only for "complete"', () => {
    const ieUA = 'Mozilla/5.0 MSIE 10.0';
    expect(isDocumentStateReady(makeWindow('complete', ieUA))).toBe(true);
    expect(isDocumentStateReady(makeWindow('interactive', ieUA))).toBe(false);
  });
});
