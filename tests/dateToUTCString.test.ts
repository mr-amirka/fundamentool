import {
  dateToUTCString, normalizeTimePart, 
} from '../src/dateToUTCString';

describe('normalizeTimePart', () => {
  test('pads single digit with zero', () => {
    expect(normalizeTimePart(0)).toBe('00');
    expect(normalizeTimePart(9)).toBe('09');
  });
  test('leaves two digits as string', () => {
    expect(normalizeTimePart(10)).toBe('10');
    expect(normalizeTimePart(12)).toBe('12');
  });
});

describe('dateToUTCString', () => {
  test('formats Date to UTC ISO-like string without hyphens/colons', () => {
    const d = new Date(Date.UTC(
      2020, 0, 2, 3, 4, 5,
    ));
    const s = dateToUTCString(d);
    expect(s).toMatch(/^\d{8}T\d{6}Z$/);
    expect(s).toBe('20200102T030405Z');
  });
  test('accepts timestamp number', () => {
    const s = dateToUTCString(Date.UTC(
      1999, 11, 31, 23, 59, 59,
    ));
    expect(s).toBe('19991231T235959Z');
  });
});
