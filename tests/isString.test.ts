import { isString } from '../src/is/isString';

describe('isString', () => {
  test('returns true for string', () => {
    expect(isString('')).toBe(true);
    expect(isString('x')).toBe(true);
  });

  test('returns false for non-string', () => {
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});
