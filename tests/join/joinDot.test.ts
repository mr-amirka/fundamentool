import {
  joinDot, 
} from '../../src/join/joinDot';

describe('joinDot', () => {
  test('joins items with dot', () => {
    expect(joinDot([
      'a',
      'b',
      'c',
    ])).toBe('a.b.c');
  });

  test('handles single item', () => {
    expect(joinDot(['hello'])).toBe('hello');
  });

  test('handles empty array', () => {
    expect(joinDot([])).toBe('');
  });
});
