import {
  isObject, 
} from './isObject';
import {
  isArray, 
} from './isArray';
import {
  isEmpty, 
} from './isEmpty';

/**
 * Checks that value is "insignificant":
 * - `null`/`undefined` (but NOT `0`)
 * - empty array
 * - empty plain object
 *
 * @param m - The value to check.
 * @returns `true` if value is insignificant.
 * @example
 * isInsign(null);  // => true
 * isInsign([]);    // => true
 * isInsign({});    // => true
 * isInsign(0);     // => false
 * isInsign([1]);   // => false
 */
export const isInsign = (m: any): boolean => {
  if (!m && m !== 0) {
    return true;
  }
  if (!isObject(m)) {
    return false;
  }
  return isArray(m) ? m.length < 1 : isEmpty(m);
};

