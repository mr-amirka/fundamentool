import {
  delimiterToCamelCase, 
} from '../src/delimiterToCamelCase';

describe('delimiterToCamelCase', () => {
  test('converts underscore-delimited to camelCase', () => {
    expect(delimiterToCamelCase('hello_world', '_')).toBe('helloWorld');
    expect(delimiterToCamelCase('foo_bar_baz', '_')).toBe('fooBarBaz');
  });

  test('converts dash-delimited to camelCase', () => {
    expect(delimiterToCamelCase('my-component', '-')).toBe('myComponent');
  });

  test('handles single word (no delimiter)', () => {
    expect(delimiterToCamelCase('hello', '_')).toBe('hello');
  });

  test('handles empty string', () => {
    expect(delimiterToCamelCase('', '_')).toBe('');
  });
});
