import {
  entries, 
} from '../../entries';
import {
  fromPairs, 
} from '../../fromPairs';
import {
  checkNoop, 
} from '../checkNoop';
import {
  filterParallel, 
} from './filterParallel';

/**
 * Parallel asynchronous filter over object.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 * 
 * @param collection - Source object.
 * @param iteratee - Predicate function.
 * @param output - Optional output object.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting object.
 * @example
 * await filterInParallel({ a: 1, b: 2 }, async (v) => v > 1, null, null, 2); // => { b: 2 }
 */
export function filterInParallel<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => any,
  output?: Record<string, T> | null,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return filterParallel(
    entries(collection),
    (line: [string, T]) => iteratee.call(
      ctx, line[1], line[0], collection,
    ),
    [],
    ctx,
    taskLimit,
    checkFn,
  )
    .then((_entries: Array<[string, T]>) => fromPairs(_entries, output || {}));
}
