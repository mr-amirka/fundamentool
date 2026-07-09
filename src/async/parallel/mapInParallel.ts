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
  mapParallel, 
} from './mapParallel';

/**
 * Parallel asynchronous map over array or object.
 * 
 * @param collection - Source object.
 * @param iteratee - Mapping function.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting object.
 * @example
 * await mapInParallel({ a: 1, b: 2 }, async (v) => v * 2, null, 2); // => { a: 2, b: 4 }
 */
export function mapInParallel<T>(
  collection: Record<string, T>,
  iteratee: (this: any, value: T, key: string, collection: Record<string, T>) => T | Promise<T>,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return mapParallel(
    entries(collection),
    async (line: [string, any]) => [line[0], await iteratee.call(
      ctx, line[1], line[0], collection,
    )] as [string, T],
    ctx,
    taskLimit,
    checkFn,
  )
    .then((_entries: Array<[string, T]>) => fromPairs(_entries, {}));
}