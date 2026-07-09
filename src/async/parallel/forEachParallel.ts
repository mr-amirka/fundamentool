import {
  loopParallel, 
} from './loopParallel';
import {
  checkNoop, 
} from '../checkNoop';

/**
 * Parallel asynchronous forEach over array.
 *
 * @param items - Source array-like collection.
 * @param fn - Iteration function.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the original `items` array.
 * @example
 * await forEachParallel([1, 2, 3], async (v) => process(v), null, 2); // 2 concurrent
 */
export function forEachParallel<T>(
  items: T[] | null | undefined,
  fn: (this: any, value: T, index: number, items: T[]) => any,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<T[]> {
  const length = items?.length || 0;
  let index = 0;
  return loopParallel(
    () => index < length && checkFn(),
    () => {
      const i = index++;
      return fn.call(
        ctx, items[i], i, items,
      );
    },
    taskLimit,
  )
    .then(() => items);
}


