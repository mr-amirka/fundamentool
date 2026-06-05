import { entries } from '../entries';
import { fromPairs } from '../fromPairs';
import { checkNoop } from './checkNoop';
import { filterAsync } from './filterAsync';

/**
 * Asynchronous filter over array or object.
 *
 * Unlike the legacy version, this helper expects `iteratee` to be a function;
 * shorthand/normalize logic is removed.
 * 
 * @param collection - Source object.
 * @param iteratee - Predicate function.
 * @param output - Optional output object.
 * @param ctx - Optional `this` context.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting object.
 * @example
 * await filterInAsync({ a: 1, b: 2 }, async (v) => v > 1); // => { b: 2 }
 */
export function filterInAsync<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => any,
  output?: Record<string, T> | null,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return filterAsync(
    entries(collection),
    (line: [string, T]) => iteratee.call(ctx, line[1], line[0], collection),
    [],
    ctx,
    checkFn,
  )
    .then((_entries: Array<[string, T]>) => fromPairs(_entries, output || {}));
}
