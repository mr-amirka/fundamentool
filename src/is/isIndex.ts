const REGEXP_INDEX = /^\d+$/;

/**
 * Checks whether a string is a non-negative integer index.
 *
 * @param v - The value to check.
 * @returns `true` if value contains only digits (a valid array index string).
 * @example
 * isIndex('0');   // => true
 * isIndex('42');  // => true
 * isIndex('-1');  // => false
 * isIndex('1.5'); // => false
 */
export const isIndex = (v: any): boolean => REGEXP_INDEX.test(String(v));

