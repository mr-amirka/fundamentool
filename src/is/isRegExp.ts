/**
 * Checks whether value is a RegExp.
 *
 * @param v - The value to check.
 * @returns `true` if value is a RegExp instance.
 * @example
 * isRegExp(/abc/); // => true
 * isRegExp('abc'); // => false
 */
export const isRegExp = (v: any): v is RegExp => v instanceof RegExp;

