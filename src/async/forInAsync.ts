import {
  checkNoop, 
} from './checkNoop';
import {
  forEachAsync, 
} from './forEachAsync';
import {
  entries, 
} from '../entries';

/**
 * Asynchronously iterates over object properties using `entries`.
 *
 * @param collection - Source object.
 * @param fn - Iteration function receiving (value, key, collection).
 * @param ctx - Optional `this` context.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the original `collection` when the loop completes.
 * @example
 * await forInAsync({ a: 1 }, async (v, k) => console.log(k, v)); // logs 'a', 1
 */
export function forInAsync<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => any,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return forEachAsync(
    entries(collection),
    (line: [string, T]) => iteratee.call(
      ctx, line[1], line[0], collection,
    ),
    ctx,
    checkFn,
  )
    .then(() => collection);
}

