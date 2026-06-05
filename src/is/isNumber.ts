/**
 * Checks whether value is a number.
 *
 * @param v - The value to check.
 * @returns `true` if value has type `'number'` (including `NaN`).
 * @example
 * isNumber(42);  // => true
 * isNumber(NaN); // => true (NaN has type 'number')
 * isNumber('1'); // => false
 */
export const isNumber = (v: any): v is number => typeof v === 'number';

