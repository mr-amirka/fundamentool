import { entries } from '../entries';
import { findAsync } from './findAsync';
import { checkNoop } from './checkNoop';

/**
 * Asynchronous find over array or object.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 * 
 * @param collection - Source array-like collection.
 * @param iteratee - Predicate function.
 * @param ctx - Optional `this` context.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the found item or `undefined`.
 * @example
 * await findInAsync({ a: 1, b: 2 }, async (v) => v === 2); // => 2
 */
export function findInAsync<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => any,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<T | undefined> {
  return findAsync(
    entries(collection),
    (line: [string, T]) => iteratee.call(ctx, line[1], line[0], collection),
    ctx,
    checkFn,
  )
    .then((line) => line?.[1]);
}
