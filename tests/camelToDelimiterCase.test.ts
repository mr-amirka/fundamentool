import {
  camelToDelimiterCase, 
} from '../src/camelToDelimiterCase';
import {
  delimiterToCamelCase, 
} from '../src/delimiterToCamelCase';

describe('camelToDelimiterCase', () => {
  test('converts camelCase to kebab-case', () => {
    expect(camelToDelimiterCase('helloWorld', '-')).toBe('hello-world');
  });

  test('converts camelCase to snake_case', () => {
    expect(camelToDelimiterCase('helloWorld', '_')).toBe('hello_world');
  });

  test('handles multiple uppercase letters', () => {
    expect(camelToDelimiterCase('myHTMLParser', '-')).toBe('my-h-t-m-l-parser');
  });

  test('handles already lowercase string', () => {
    expect(camelToDelimiterCase('hello', '-')).toBe('hello');
  });

  test('handles empty string', () => {
    expect(camelToDelimiterCase('', '-')).toBe('');
  });
});

describe('delimiterToCamelCase', () => {
  test('converts kebab-case to camelCase', () => {
    expect(delimiterToCamelCase('hello-world', '-')).toBe('helloWorld');
  });

  test('converts snake_case to camelCase', () => {
    expect(delimiterToCamelCase('hello_world', '_')).toBe('helloWorld');
  });

  test('handles multiple parts', () => {
    expect(delimiterToCamelCase('one-two-three', '-')).toBe('oneTwoThree');
  });

  test('handles string without delimiter', () => {
    expect(delimiterToCamelCase('hello', '-')).toBe('hello');
  });

  test('handles empty string', () => {
    expect(delimiterToCamelCase('', '-')).toBe('');
  });
});
