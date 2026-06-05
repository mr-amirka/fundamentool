import { splitAmp } from '../../src/split/splitAmp';

describe('splitAmp', () => {
  test('splits by ampersand', () => {
    expect(splitAmp('a&b&c')).toEqual(['a', 'b', 'c']);
  });

  test('handles single value without ampersand', () => {
    expect(splitAmp('hello')).toEqual(['hello']);
  });

  test('handles empty string', () => {
    expect(splitAmp('')).toEqual(['']);
  });
});
