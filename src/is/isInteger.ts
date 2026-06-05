/**
 * Checks whether value is a 32-bit signed integer.
 *
 * @param v - The value to check.
 * @returns `true` if value is a 32-bit integer.
 * @example
 * isInteger(42);      // => true
 * isInteger(-1);      // => true
 * isInteger(1.5);     // => false
 * isInteger(2 ** 31); // => false (overflow)
 */
export const isInteger = (v: any): boolean => ((v as any) ^ 0) === v;

