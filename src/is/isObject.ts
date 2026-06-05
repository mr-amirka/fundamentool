/**
 * Checks whether value is a non-null object.
 *
 * @param v - The value to check.
 * @returns `true` if value is an object and not null.
 * @example
 * isObject({});   // => true
 * isObject([]);   // => true
 * isObject(null); // => false
 */
export const isObject = (v: any): v is object => !!v && typeof v === 'object';

