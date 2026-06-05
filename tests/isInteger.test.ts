import { isInteger } from '../src/is/isInteger';

describe('isInteger', () => {
  test('returns true for integers', () => {
    expect(isInteger(0)).toBe(true);
    expect(isInteger(42)).toBe(true);
  });

  test('returns false for non-integers', () => {
    expect(isInteger(3.14)).toBe(false);
    expect(isInteger('1')).toBe(false);
  });
});
