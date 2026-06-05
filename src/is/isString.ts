/**
 * Checks whether value is a string.
 *
 * @param v - The value to check.
 * @returns `true` if value has type `'string'`.
 * @example
 * isString('hello'); // => true
 * isString(42);      // => false
 */
export const isString = (v: any): v is string => typeof v === 'string';

