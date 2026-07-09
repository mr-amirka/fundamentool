import {
  isNumber, 
} from '../src/is/isNumber';

describe('isNumber', () => {
  test('returns true for number', () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(3.14)).toBe(true);
  });

  test('returns false for non-number', () => {
    expect(isNumber('1')).toBe(false);
    expect(isNumber(null)).toBe(false);
  });
});
