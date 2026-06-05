const REGEXP_OBJECT_LIKE = /object|function/;

/**
 * Checks whether value is object-like (object or function).
 *
 * @param v - The value to check.
 * @returns `true` if `typeof v` is `'object'` or `'function'` and value is truthy.
 * @example
 * isObjectLike({});       // => true
 * isObjectLike(() => {}); // => true
 * isObjectLike(null);     // => false
 * isObjectLike('str');    // => false
 */
export const isObjectLike = (v: any): boolean =>
  !!v && REGEXP_OBJECT_LIKE.test(typeof v);

