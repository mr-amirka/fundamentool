import {
  forEach, 
} from './forEach';
import {
  forIn, 
} from './forIn';
import {
  isArray, 
} from './is/isArray';

/**
 * Iterates over a collection (array or object) and invokes iteratee for each item.
 * 
 * @param collection - The collection to iterate over.
 * @param iteratee - The function to invoke for each item.
 * @param ctx - The context to use for the iteratee.
 * @returns void
 * @example
 * each([1, 2], (v, i) => console.log(i, v));        // 0 1 / 1 2
 * each({ a: 1 }, (v, k) => console.log(k, v));      // a 1
 */
export const each = <T = any, C extends T[] | Record<string, T> = T[] | Record<string, T>>(
  collection: C,
  iteratee: (this: any, value: T, key: keyof C, collection: C) => void,
  ctx?: any,
): void => (isArray(collection) ? forEach : forIn as any)(
  collection, iteratee, ctx,
);
