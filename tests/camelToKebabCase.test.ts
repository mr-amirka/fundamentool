import {
  camelToKebabCase, 
} from '../src/camelToKebabCase';

describe('camelToKebabCase', () => {
  test('converts camelCase to kebab-case', () => {
    expect(camelToKebabCase('helloWorld')).toBe('hello-world');
  });

  test('multiple caps', () => {
    expect(camelToKebabCase('fooBarBaz')).toBe('foo-bar-baz');
  });
});
