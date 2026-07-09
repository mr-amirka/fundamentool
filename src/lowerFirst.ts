import {
  toLower, 
} from './toLower';

/**
 * Lowercases the first character of the string.
 * 
 * @param v - The string to lowercase the first character of.
 * @returns The string with the first character lowercased.
 * @example
 * lowerFirst('Hello') // => 'hello'
 */
export const lowerFirst = (v: string): string =>
  toLower(v.slice(0, 1)) + v.slice(1);

