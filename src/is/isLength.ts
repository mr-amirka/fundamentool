/**
 * @overview isLength
 * @author Amir Absaliamov <mr.amirka@ya.ru>
 */

const MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks whether value is a valid array-like length.
 *
 * @param v - The value to check.
 * @returns `true` if value is a non-negative integer not exceeding `Number.MAX_SAFE_INTEGER`.
 * @example
 * isLength(0);   // => true
 * isLength(100); // => true
 * isLength(-1);  // => false
 * isLength(1.5); // => false
 */
export const isLength = (v: any) => typeof v == 'number' && v > -1 && v % 1 == 0
  && v <= MAX_SAFE_INTEGER;
