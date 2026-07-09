
import {
  isFunction, 
} from './is/isFunction';
import {
  isMatch, 
} from './is/isMatch';
import {
  findIn, 
} from './findIn';

/**
 * Checks if at least one property in the collection matches the identity.
 * Identity can be a function or an object for isMatch.
 * 
 * @param collection - The collection to search in.
 * @param identity - The identity to search for.
 * @returns `true` if at least one property matches, `false` otherwise.
 * @example
 * someIn({ a: 1, b: 3 }, v => v > 2); // => true
 */
export const someIn = <T extends Record<string, any>>(
  collection: T,
  identity?: any,
): boolean => findIn(collection, isFunction(identity) ? identity : (v: T[keyof T]) => isMatch(v, identity)) !== undefined;
