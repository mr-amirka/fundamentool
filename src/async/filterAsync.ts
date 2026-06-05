import { checkNoop } from './checkNoop';
import { loopAsync } from './loopAsync';

/**
 * Asynchronously filters items using the provided `iteratee`.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Predicate function returning truthy/falsey or a promise.
 * @param output - Optional array to push accepted items into.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise-like object resolved with the resulting array.
 * @example
 * await filterAsync([1, 2, 3], async (v) => v > 1, null); // => [2, 3]
 */
export function filterAsync<T>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => any,
  output: T[] | null,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<T[]> {
  const length = items?.length || 0;
  let index = 0;
  const filtered: T[] = output || [];
  return loopAsync(
    () => index < length && checkFn(),
    async () => {
      const i = index++;
      const item = items[i];
      if (await iteratee.call(ctx, item, i, items)) {
        filtered.push(item);
      }
    },
  ).then(() => filtered);
}


