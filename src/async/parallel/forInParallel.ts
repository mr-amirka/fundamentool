import { entries } from '../../entries';
import { checkNoop } from '../checkNoop';
import { forEachParallel } from './forEachParallel';

/**
 * Parallel asynchronous iteration over object properties.
 *
 * @param collection - Source object.
 * @param fn - Iteration function receiving (value, key, collection).
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the resulting object.
 * @example
 * await forInParallel({ a: 1, b: 2 }, async (v, k) => process(k, v), null, 2);
 */
export function forInParallel<T>(
  collection: Record<string, T>,
  fn: (this: any, value: any, key: string, collection: T) => any,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<Record<string, T>> {
  return collection
    ? forEachParallel(
      entries(collection),
      (line: [string, any]) => fn.call(ctx, line[1], line[0], collection),
      ctx,
      taskLimit,
      checkFn,
    )
      .then(() => collection)
    : Promise.resolve(collection);
}


