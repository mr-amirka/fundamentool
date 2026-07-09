import {
  camelToDelimiterCase, 
} from '../src/camelToDelimiterCase';
import {
  camelToKebabCase, 
} from '../src/camelToKebabCase';
import {
  camelToSnakeCase, 
} from '../src/camelToSnakeCase';
import {
  toLower, 
} from '../src/toLower';
import {
  toUpper, 
} from '../src/toUpper';

describe('toLower / toUpper', () => {
  test('toLower lowercases ASCII', () => {
    expect(toLower('AbC')).toBe('abc');
  });

  test('toUpper uppercases ASCII', () => {
    expect(toUpper('AbC')).toBe('ABC');
  });
});

describe('camelToDelimiterCase family', () => {
  test('camelToDelimiterCase uses given delimiter', () => {
    expect(camelToDelimiterCase('camelCaseString', '-')).toBe('camel-case-string');
    expect(camelToDelimiterCase('camelCaseString', '_')).toBe('camel_case_string');
  });

  test('camelToKebabCase delegates to camelToDelimiterCase with -', () => {
    expect(camelToKebabCase('camelCaseString')).toBe('camel-case-string');
  });

  test('camelToSnakeCase delegates to camelToDelimiterCase with _', () => {
    expect(camelToSnakeCase('camelCaseString')).toBe('camel_case_string');
  });

  test('handles leading capital letter', () => {
    expect(camelToKebabCase('CamelCase')).toBe('-camel-case');
  });
});
