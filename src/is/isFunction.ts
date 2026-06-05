/**
 * Checks whether value is a function.
 *
 * @param v - The value to check.
 * @returns `true` if value is a function.
 * @example
 * isFunction(() => {}); // => true
 * isFunction({});       // => false
 */
export const isFunction = (v: any): v is (...args: any[]) => any => typeof v === 'function';
