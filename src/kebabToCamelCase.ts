import { delimiterToCamelCase } from './delimiterToCamelCase';

/**
 * Converts kebab-case string to camelCase.
 * 
 * @param value - The string to convert.
 * @returns The converted string.
 * @example
 * kebabToCamelCase('hello-world') // "helloWorld"
 */
export const kebabToCamelCase = (value: string): string =>
  delimiterToCamelCase(value, '-');
