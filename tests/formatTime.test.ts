import { formatTime, normalizeDate, getData } from '../src/formatTime';

describe('formatTime', () => {
  test('normalizeDate returns Date for valid input', () => {
    const d = normalizeDate('2020-01-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);
  });

  test('normalizeDate returns null for invalid input', () => {
    const d = normalizeDate('not-a-date');
    expect(d).toBeNull();
  });

  test('getData returns tokens for date', () => {
    const date = new Date(Date.UTC(2020, 0, 2, 3, 4, 5));
    const data = getData(date, true);
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data.yyyy).toBe('2020');
    expect(data.mm).toBe('01');
  });

  test('formatTime formats date with default mask', () => {
    const date = new Date(2020, 0, 2, 3, 4, 5);
    const result = formatTime(date);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/2020/);
  });
});
