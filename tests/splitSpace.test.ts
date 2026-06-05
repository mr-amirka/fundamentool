import { splitSpace } from '../src/split/splitSpace';

describe('splitSpace', () => {
  test('splits by whitespace', () => {
    expect(splitSpace('a b  c')).toEqual(['a', 'b', 'c']);
  });

  test('single word', () => {
    expect(splitSpace('hello')).toEqual(['hello']);
  });
});
