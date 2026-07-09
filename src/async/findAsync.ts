import {
  checkNoop, 
} from './checkNoop';
import {
  loopAsync, 
} from './loopAsync';

/**
 * Asynchronously finds first item that matches `iteratee`.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Predicate function returning truthy/falsey or a promise.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise-like object resolved with the found item or `undefined`.
 * @example
 * await findAsync([1, 2, 3], async (v) => v === 2); // => 2
 */
export function findAsync<T>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => any,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<T | undefined> {
  const length = items?.length || 0;
  let index = 0;
  let found: T | undefined;

  return loopAsync(() => !found && index < length && checkFn(),
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
    })
    .then(() => found);
}
