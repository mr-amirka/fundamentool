/**
 * Checks whether value is neither `undefined` nor `null`.
 *
 * @param v - The value to check.
 * @returns `true` if value is defined and not null.
 * @example
 * isDefined(0);         // => true
 * isDefined('');        // => true
 * isDefined(null);      // => false
 * isDefined(undefined); // => false
 */
export const isDefined = (v: any): boolean => v !== undefined && v !== null;
