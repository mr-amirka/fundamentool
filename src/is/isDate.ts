
/**
 * Checks whether value is a Date instance.
 *
 * @param v - The value to check.
 * @returns `true` if value is a Date.
 * @example
 * isDate(new Date());    // => true
 * isDate('2024-01-01'); // => false
 */
export const isDate = (v: any) => v instanceof Date;