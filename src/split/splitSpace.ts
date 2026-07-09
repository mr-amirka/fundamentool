import {
  splitProvider, 
} from './splitProvider';

/**
 * Splits string by whitespace.
 * 
 * @param src - The string to split.
 * @returns The split strings.
 * @example
 * splitSpace('a b  c') // => ['a', 'b', 'c']
 * splitSpace('hello') // => ['hello']
 */
export const splitSpace = splitProvider(/\s+/);
