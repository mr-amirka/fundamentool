import {
  isBoolean, 
} from '../src/is/isBoolean';

describe('isBoolean', () => {
  test('returns true for boolean', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
  });

  test('returns false for non-boolean', () => {
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean('true')).toBe(false);
  });
});
