import { joinAmp } from '../../src/join/joinAmp';

describe('joinAmp', () => {
  test('joins items with ampersand', () => {
    expect(joinAmp(['a', 'b', 'c'])).toBe('a&b&c');
  });

  test('handles single item', () => {
    expect(joinAmp(['hello'])).toBe('hello');
  });

  test('handles empty array', () => {
    expect(joinAmp([])).toBe('');
  });
});
