import {
  checkNoop, 
} from '../checkNoop';
import {
  loopParallel, 
} from './loopParallel';

/**
 * Parallel asynchronous find over array.
 *
 * @param items - Source array.
 * @param iteratee - Predicate function.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the found item or `undefined`.
 * @example
 * await findParallel([1, 2, 3], async (v) => v === 2, null, 2); // => 2
 */
export function findParallel<T>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => any,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<T | undefined> {
  const length = items?.length || 0;
  let index = 0;
  let found: T | undefined;

  return loopParallel(
    () => !found && index < length && checkFn(),
    async () => {
      const i = index++;
      const item = items[i];
      if (await iteratee.call(
        ctx, item, i, items,
      )) {
        if (!found) {
          found = item;
        }
      }
    },
    taskLimit,
  )
    .then(() => found);
}

