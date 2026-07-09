import {
  kebabToCamelCase, 
} from '../src/kebabToCamelCase';

describe('kebabToCamelCase', () => {
  test('converts kebab to camel', () => {
    expect(kebabToCamelCase('hello-world')).toBe('helloWorld');
    expect(kebabToCamelCase('foo-bar-baz')).toBe('fooBarBaz');
  });

  test('single segment unchanged', () => {
    expect(kebabToCamelCase('hello')).toBe('hello');
  });
});
