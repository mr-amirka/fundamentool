import { entries } from '../entries';
import { fromPairs } from '../fromPairs';
import { checkNoop } from './checkNoop';
import { mapAsync } from './mapAsync';

/**
 * Asynchronous map over object.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 * 
 * @param collection - Source object.
 * @param iteratee - Mapping function.
 * @param ctx - Optional `this` context.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting object.
 * @example
 * await mapInAsync({ a: 1 }, async (v) => v * 2); // => { a: 2 }
 */
export function mapInAsync<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => T | Promise<T>,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return mapAsync(
    entries(collection),
    async (line: [string, T]) => [line[0], await iteratee.call(ctx, line[1], line[0], collection)] as [string, T],
    ctx,
    checkFn,
  )
    .then((_entries: Array<[string, T]>) => fromPairs(_entries, {}));
}


