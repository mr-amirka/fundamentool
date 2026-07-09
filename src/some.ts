import {
  isFunction, 
} from './is/isFunction';
import {
  isMatch, 
} from './is/isMatch';
import {
  find, 
} from './find';

/**
 * Checks if at least one element in the collection matches the identity.
 * Identity can be a function or an object for isMatch.
 * 
 * @param collection - The collection to search in.
 * @param identity - The identity to search for.
 * @returns `true` if at least one element matches, `false` otherwise.
 * @example
 * some([1, 2, 3], v => v > 2);            // => true
 * some([{ a: 1 }, { a: 2 }], { a: 2 });   // => true
 */
export const some = <T>(
  collection: T[],
  identity?: any,
): boolean => find(collection, isFunction(identity) ? identity : (v: T) => isMatch(v, identity)) !== undefined;
