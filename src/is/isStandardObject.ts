import { isArray } from './isArray';
import { isPlainObject } from './isPlainObject';

/**
 * Checks whether value is a "standard" object: plain object or array.
 *
 * @param value - The value to check.
 * @returns `true` if value is a plain object or an array.
 * @example
 * isStandardObject({});       // => true
 * isStandardObject([]);       // => true
 * isStandardObject(new Date()); // => false
 */
export function isStandardObject(value: unknown): boolean {
  return isArray(value) || isPlainObject(value);
}

