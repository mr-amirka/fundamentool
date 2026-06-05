/**
 * Safe wrapper around `Object.getPrototypeOf`.
 *
 * Returns `null` when `Object.getPrototypeOf` is not available.
 * 
 * @param v - The value to get the prototype of.
 * @returns The prototype of the value, or `null` if the prototype is not available.
 * @example
 * getPrototypeOf([]);  // => Array.prototype
 * getPrototypeOf({});  // => Object.prototype
 */
export const getPrototypeOf = Object.getPrototypeOf || ((v: any) => null);

