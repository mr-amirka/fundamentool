import { splitProvider } from './splitProvider';

/**
 * Splits string by dot.
 * 
 * @param src - The string to split.
 * @returns The split strings.
 * @example
 * splitDot('a.b.c') // => ['a', 'b', 'c']
 * splitDot('hello') // => ['hello']
 */
export const splitDot = splitProvider(/\./);
