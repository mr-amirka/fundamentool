import { isRegExp } from '../src/is/isRegExp';

describe('isRegExp', () => {
  test('returns true for RegExp', () => {
    expect(isRegExp(/a/)).toBe(true);
    expect(isRegExp(new RegExp('x'))).toBe(true);
  });

  test('returns false for non-RegExp', () => {
    expect(isRegExp('')).toBe(false);
    expect(isRegExp({})).toBe(false);
  });
});
