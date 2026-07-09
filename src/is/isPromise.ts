import {
  isFunction, 
} from './isFunction';

/**
 * Checks whether value is a Promise (or thenable).
 *
 * @param v - The value to check.
 * @returns `true` if value has a `.then` method.
 * @example
 * isPromise(Promise.resolve());   // => true
 * isPromise({ then: () => {} });  // => true
 * isPromise({});                  // => false
 */
export const isPromise = (v: any): v is Promise<any> =>
  !!v && isFunction((v as any).then);
