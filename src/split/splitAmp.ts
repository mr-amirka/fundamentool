import { splitProvider } from './splitProvider';

/**
 * Splits string by ampersand.
 * 
 * @param src - The string to split.
 * @returns The split strings.
 * @example
 * splitAmp('a&b&c') // => ['a', 'b', 'c']
 * splitAmp('hello') // => ['hello']
 */
export const splitAmp = splitProvider(/\&/);
