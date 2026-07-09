import {
  isBlob, 
} from '../../src/is/isBlob';

describe('isBlob', () => {
  test('returns true for Blob instances when Blob is available', () => {
    if (typeof Blob === 'undefined') {
      return;
    }
    expect(isBlob(new Blob(['data']))).toBe(true);
  });

  test('returns false for non-Blob values', () => {
    expect(isBlob('data')).toBe(false);
    expect(isBlob(null)).toBe(false);
    expect(isBlob(undefined)).toBe(false);
    expect(isBlob({})).toBe(false);
  });
});
