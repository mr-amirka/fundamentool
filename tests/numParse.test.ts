import {
  numParse, 
} from '../src/numParse';

describe('numParse', () => {
  test('parses number string', () => {
    expect(numParse('42')).toBe(42);
    expect(numParse('-3.14')).toBe(-3.14);
  });

  test('returns null for null/undefined', () => {
    expect(numParse(null)).toBeNull();
    expect(numParse(undefined)).toBeNull();
  });

  test('strips whitespace', () => {
    expect(numParse('  10  ')).toBe(10);
  });
});
