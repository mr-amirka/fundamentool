import { checkNoop } from './checkNoop';
import { loopAsync } from './loopAsync';

/**
 * Asynchronously iterates over an array-like `items`.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Iteration function, may return a value or a promise.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the original `items` array when the loop completes.
 * @example
 * await forEachAsync([1, 2], async (v) => console.log(v)); // logs 1, 2
 */
export function forEachAsync<T>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => any,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<T[]> {
  const length = items?.length || 0;
  let index = 0;
  return loopAsync(
    () => index < length && checkFn(),
    () => {
      const i = index++;
      return iteratee.call(ctx, items[i], i, items);
    },
  )
    .then(() => items);
}

