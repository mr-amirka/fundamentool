import {
  isArrayBuffer, 
} from '../../src/is/isArrayBuffer';

describe('isArrayBuffer', () => {
  test('returns true for ArrayBuffer', () => {
    expect(isArrayBuffer(new ArrayBuffer(8))).toBe(true);
    expect(isArrayBuffer(new ArrayBuffer(0))).toBe(true);
  });

  test('returns false for non-ArrayBuffer values', () => {
    expect(isArrayBuffer([])).toBe(false);
    expect(isArrayBuffer({})).toBe(false);
    expect(isArrayBuffer(null)).toBe(false);
    expect(isArrayBuffer(undefined)).toBe(false);
    expect(isArrayBuffer('data')).toBe(false);
  });
});
