import { isDefined } from '../src/is/isDefined';

describe('isDefined', () => {
  test('returns false for undefined and null', () => {
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(null)).toBe(false);
  });

  test('returns true for other values', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
  });
});
