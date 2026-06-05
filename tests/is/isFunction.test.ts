import { isFunction } from '../../src/is/isFunction';

describe('isFunction', () => {
  test('returns true for functions', () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function() {})).toBe(true);
    expect(isFunction(async () => {})).toBe(true);
    expect(isFunction(class {})).toBe(true);
  });

  test('returns false for non-functions', () => {
    expect(isFunction({})).toBe(false);
    expect(isFunction([])).toBe(false);
    expect(isFunction(42)).toBe(false);
    expect(isFunction('fn')).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction(undefined)).toBe(false);
  });
});
