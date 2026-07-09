import {
  isInvalidStringLength, 
} from '../../src/is/isInvalidStringLength';

describe('isInvalidStringLength', () => {
  test('returns false when string meets minimum length', () => {
    expect(isInvalidStringLength('hello', 3)).toBe(false);
    expect(isInvalidStringLength('hello', 5)).toBe(false);
  });

  test('returns true when string is too short', () => {
    expect(isInvalidStringLength('hi', 3)).toBe(true);
    expect(isInvalidStringLength('', 1)).toBe(true);
  });

  test('returns true for non-string values', () => {
    expect(isInvalidStringLength(null, 3)).toBe(true);
    expect(isInvalidStringLength(undefined, 3)).toBe(true);
    expect(isInvalidStringLength(123, 1)).toBe(true);
  });
});
