import { isObjectLike } from './isObjectLike';

/**
 * Checks whether value is a "plain object":
 * an object whose prototype chain has at most `Object.prototype` or `null`.
 *
 * @param value - The value to check.
 * @returns `true` if value is a plain object.
 * @example
 * isPlainObject({});                  // => true
 * isPlainObject(Object.create(null)); // => true
 * isPlainObject([]);                  // => false
 * isPlainObject(new Date());          // => false
 */
export const isPlainObject = (value: any): value is Record<string, any> =>
  isObjectLike(value) && isPlainObjectBase(value);


export function isPlainObjectBase(value: any): value is Record<string, any> {
  const proto = Object.getPrototypeOf(value);

  return proto ? !Object.getPrototypeOf(proto) : true;
}