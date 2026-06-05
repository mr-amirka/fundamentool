import { checkNoop } from '../checkNoop';
import { loopParallel } from './loopParallel';

/**
 * Parallel asynchronous map over items.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Mapping function, may return a value or a promise.
 * @param ctx - Optional `this` context for the iteratee.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting array.
 * @example
 * await mapParallel([1, 2, 3], async (v) => v * 2, null, 2); // => [2, 4, 6]
 */
export function mapParallel<T, R>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => R | Promise<R>,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<R[]> {
  const length = items?.length || 0;
  let index = 0;
  const result: R[] = new Array(length);

  return loopParallel(
    () => index < length && checkFn(),
    async () => {
      const i = index++;
      result[i] = await iteratee.call(ctx, items[i], i, items);
    },
    taskLimit,
  ).then(() => result);
}

