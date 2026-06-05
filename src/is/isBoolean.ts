/**
 * Checks whether value is a boolean.
 *
 * @param v - The value to check.
 * @returns `true` if value is a boolean.
 * @example
 * isBoolean(true);  // => true
 * isBoolean(false); // => true
 * isBoolean(1);     // => false
 */
export const isBoolean = (v: any) => typeof v === 'boolean';

