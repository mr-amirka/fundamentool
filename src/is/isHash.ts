import { isString } from './isString';

const REGEXP_HASH = /^[0-9a-f]+$/;

/**
 * Checks whether value is a hex string of the given length (default 32).
 *
 * @param v - The value to check.
 * @param length - Expected length of the hex string (default: 32).
 * @returns `true` if value is a lowercase hex string of the expected length.
 * @example
 * isHash('a'.repeat(32));  // => true
 * isHash('abc123', 6);     // => true
 * isHash('xyz', 3);        // => false (non-hex chars)
 */
export const isHash = (v: any, length: number = 32): boolean =>
  isString(v) && (v as string).length === length && REGEXP_HASH.test(v as string);

