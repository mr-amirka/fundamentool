import { splitDot } from '../../src/split/splitDot';

describe('splitDot', () => {
  test('splits by dot', () => {
    expect(splitDot('a.b.c')).toEqual(['a', 'b', 'c']);
  });

  test('handles single value without dot', () => {
    expect(splitDot('hello')).toEqual(['hello']);
  });

  test('handles empty string', () => {
    expect(splitDot('')).toEqual(['']);
  });
});
