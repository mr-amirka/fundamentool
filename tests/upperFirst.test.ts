import {
  upperFirst, 
} from '../src/upperFirst';

describe('upperFirst', () => {
  test('uppercases first char', () => {
    expect(upperFirst('hello')).toBe('Hello');
  });

  test('empty string', () => {
    expect(upperFirst('')).toBe('');
  });
});
