import {
  isPlainObjectBase, 
} from './isPlainObject';
import {
  isLength, 
} from './isLength';

/**
 * Checks whether value is a "collection": plain object or array-like object.
 *
 * @param v - The value to check.
 * @returns `true` if value is a non-null object with valid `length` or a plain object.
 * @example
 * isCollection([1, 2]);        // => true
 * isCollection({ a: 1 });      // => true
 * isCollection({ length: 3 }); // => true
 * isCollection('hello');       // => false
 */
export const isCollection = (v: any): boolean =>
  !!v && typeof v === 'object' && (isLength(v.length) || isPlainObjectBase(v));

