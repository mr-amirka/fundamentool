/**
 * Checks whether value is `NaN` (wraps `Number.isNaN`).
 * Unlike the global `isNaN`, does not coerce the value before checking.
 *
 * @param v - The value to check.
 * @returns `true` only if value is exactly `NaN`.
 * @example
 * isNaN(NaN);       // => true
 * isNaN(undefined); // => false (unlike global isNaN)
 * isNaN(1);         // => false
 */
export const isNaN: (v: any) => boolean = Number.isNaN;

