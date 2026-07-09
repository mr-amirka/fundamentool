import {
  delimiterToCamelCase, 
} from './delimiterToCamelCase';

/**
 * Converts snake_case string to camelCase.
 * 
 * @param value - The string to convert.
 * @returns The converted string.
 * @example
 * snakeToCamelCase('hello_world') // "helloWorld"
 */
export const snakeToCamelCase = (value: string): string =>
  delimiterToCamelCase(value, '_');

