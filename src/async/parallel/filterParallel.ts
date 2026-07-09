import {
  filter, 
} from '../../filter';
import {
  loopParallel, 
} from './loopParallel';
import {
  checkNoop, 
} from '../checkNoop';

/**
 * Parallel asynchronous filter over items.
 *
 * First phase evaluates predicate in parallel and stores boolean flags, then
 * reuses generic `filterEach` to build resulting array.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Predicate function.
 * @param output - Optional output array.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with resulting array.
 * @example
 * await filterParallel([1, 2, 3], async (v) => v > 1, null, null, 2); // => [2, 3]
 */
export function filterParallel<T>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => any,
  output: T[] | null,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<T[]> {
  const length = items.length;
  const filtered: boolean[] = new Array(length);
  let index = 0;

  function iterateeFn(_item: T, i: number) {
    return filtered[i];
  }

  return loopParallel(
    () => index < length && checkFn(),
    async () => {
      const i = index++;
      filtered[i] = await iteratee.call(
        ctx, items[i], i, items,
      );
    },
    taskLimit,
  )
    .then(() => filter(
      items, iterateeFn, output || [],
    ));
}

