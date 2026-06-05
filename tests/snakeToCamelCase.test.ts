import { snakeToCamelCase } from '../src/snakeToCamelCase';

describe('snakeToCamelCase', () => {
  test('converts snake to camel', () => {
    expect(snakeToCamelCase('hello_world')).toBe('helloWorld');
    expect(snakeToCamelCase('foo_bar_baz')).toBe('fooBarBaz');
  });

  test('single segment unchanged', () => {
    expect(snakeToCamelCase('hello')).toBe('hello');
  });
});
