import {
  isString, 
} from './isString';

/**
 * Returns `true` when value is not a string or has length less than required.
 *
 * @param v - The value to check.
 * @param length - Minimum required length.
 * @returns `true` if value is invalid (not a string or too short).
 * @example
 * isInvalidStringLength('hello', 3); // => false
 * isInvalidStringLength('hi', 3);    // => true
 * isInvalidStringLength(null, 3);    // => true
 */
export const isInvalidStringLength = (v: any, length: number): boolean =>
  !isString(v) || (v as string).length < length;

