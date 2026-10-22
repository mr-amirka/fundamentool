import {
  formatTime,
  normalizeDate,
  getData,
  getRFC3339,
} from '../src/formatTime';

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
    const date = new Date(Date.UTC(
      2020, 0, 2, 3, 4, 5,
    ));
    const data = getData(date, true);
    expect(data).not.toBeNull();
    if (!data) {
      return;
    }
    expect(data.yyyy).toBe('2020');
    expect(data.mm).toBe('01');
  });

  test('formatTime formats date with default mask', () => {
    const date = new Date(
      2020, 0, 2, 3, 4, 5,
    );
    const result = formatTime(date);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/2020/);
  });
});

describe('formatTime — every field and edge', () => {
  it('an invalid date formats as empty; normalizeDate: none — now, a Date — itself, junk — null, a symbol — null (logged)', () => {
    expect(formatTime('not a date')).toBe('');
    expect(normalizeDate(undefined as never)?.getTime()).toBeLessThanOrEqual(Date.now());
    const date = new Date(0);
    expect(normalizeDate(date)).toBe(date);
    expect(normalizeDate('nonsense')).toBeNull();
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(normalizeDate(Symbol('x') as never)).toBeNull();
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it('12-hour clock and the day halves; the offset — Z in UTC, ±HH:MM otherwise', () => {
    const midnight = Date.UTC(
      2026, 0, 2, 0, 5,
    );
    expect(formatTime(
      midnight, '{h} {hh} {t} {tt} {T} {TT}', true,
    )).toBe('12 12 a am A AM');
    const evening = Date.UTC(
      2026, 0, 2, 13, 5,
    );
    expect(formatTime(
      evening, '{h} {hh} {t} {tt} {T} {TT} {o}', true,
    )).toBe('1 01 p pm P PM Z');
    expect(formatTime(evening, '{o}')).toMatch(/^[+-]\d\d:\d\d$/);
    expect(getRFC3339(evening, true)).toBe('2026-01-02T13:05:00.00Z'); // centiseconds — RFC 3339 allows any fraction
  });
});
