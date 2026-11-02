
import {
  isFunction,
} from './is/isFunction';
import {
  matchProvider,
} from './match/matchProvider';
import {
  findIn,
} from './findIn';

/**
 * Checks if at least one property in the collection matches the identity.
 * Identity can be a function or a pattern of `fundamentool/match`, compiled once before the loop.
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
): boolean => findIn(collection, isFunction(identity) ? identity : matchProvider(identity)) !== undefined;
