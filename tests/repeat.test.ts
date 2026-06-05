import { repeat } from '../src/repeat';

describe('repeat', () => {
  test('repeats string count times', () => {
    expect(repeat('a', 3)).toBe('aaa');
    expect(repeat('ab', 2)).toBe('abab');
  });

  test('zero count returns empty', () => {
    expect(repeat('x', 0)).toBe('');
  });

  test('one count returns same string', () => {
    expect(repeat('hello', 1)).toBe('hello');
  });
});
