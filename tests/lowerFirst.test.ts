import { lowerFirst } from '../src/lowerFirst';

describe('lowerFirst', () => {
  test('lowercases first char', () => {
    expect(lowerFirst('Hello')).toBe('hello');
  });

  test('single char', () => {
    expect(lowerFirst('X')).toBe('x');
  });
});
