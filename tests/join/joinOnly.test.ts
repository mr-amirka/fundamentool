import { joinOnly } from '../../src/join/joinOnly';

describe('joinOnly', () => {
  test('joins items without delimiter', () => {
    expect(joinOnly(['a', 'b', 'c'])).toBe('abc');
  });

  test('handles single item', () => {
    expect(joinOnly(['hello'])).toBe('hello');
  });

  test('handles empty array', () => {
    expect(joinOnly([])).toBe('');
  });
});
