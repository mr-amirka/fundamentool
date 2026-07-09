import {
  isLength, 
} from './isLength';

/**
 * Checks whether value is array-like (non-null object with a valid numeric `length`).
 *
 * @param v - The value to check.
 * @returns `true` if value is a non-null object with a valid `length` property.
 * @example
 * isArrayLike([1, 2]);        // => true
 * isArrayLike({ length: 3 }); // => true
 * isArrayLike('hello');       // => false
 */
export const isArrayLike = (v: any) => v && typeof v === 'object' && isLength(v.length);
