import {
  entries, 
} from '../../entries';
import {
  findParallel, 
} from './findParallel';
import {
  checkNoop, 
} from '../checkNoop';

/**
 * Parallel asynchronous find over object.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 * 
 * @param collection - Source object.
 * @param iteratee - Predicate function.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the found item or `undefined`.
 * @example
 * await findInParallel({ a: 1, b: 2 }, async (v) => v === 2, null, 2); // => 2
 */
export function findInParallel<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => any,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<T | undefined> {
  return collection
    ? findParallel(
      entries(collection),
      (line: [string, T]) => iteratee.call(
        ctx, line[1], line[0], collection,
      ),
      ctx,
      taskLimit,
      checkFn,
    )
      .then((line) => line?.[1])
    : Promise.resolve() as Promise<T | undefined>;
}

