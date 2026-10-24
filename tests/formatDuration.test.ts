import {
  formatDuration,
} from '../src/formatDuration';

describe('formatDuration — a game\'s timer, the same in every locale', () => {
  it.each([
    [
      0,
      '0:00',
    ],
    [
      999,
      '0:00',
    ],
    [
      65_000,
      '1:05',
    ],
    [
      600_000,
      '10:00',
    ],
    [
      4_503_000,
      '75:03',
    ],
    [
      -5000,
      '0:00',
    ],
    [
      NaN,
      '0:00',
    ],
  ])('%s ms → %s', (ms, shown) => {
    expect(formatDuration(ms)).toBe(shown);
  });
});
