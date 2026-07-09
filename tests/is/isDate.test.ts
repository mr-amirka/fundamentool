import {
  isDate, 
} from '../../src/is/isDate';

describe('isDate', () => {
  test('returns true for Date instances', () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate(new Date('2024-01-01'))).toBe(true);
  });

  test('returns false for non-Date values', () => {
    expect(isDate('2024-01-01')).toBe(false);
    expect(isDate(1704067200000)).toBe(false);
    expect(isDate(null)).toBe(false);
    expect(isDate(undefined)).toBe(false);
    expect(isDate({})).toBe(false);
  });
});
