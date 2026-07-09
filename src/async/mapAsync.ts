import {
  checkNoop, 
} from './checkNoop';
import {
  loopAsync, 
} from './loopAsync';

/**
 * Asynchronously maps an array-like `items` using `iteratee`.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Mapping function, may return a value or a promise.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the resulting array.
 * @example
 * await mapAsync([1, 2], async (v) => v * 2); // => [2, 4]
 */
export function mapAsync<T, R>(
  items: T[],
  iteratee: (this: any, value: T, index: number, items: T[]) => R | Promise<R>,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<R[]> {
  const length = items?.length || 0;
  let index = 0;
  const result: R[] = new Array(length);

  return loopAsync(() => index < length && checkFn(),
    async () => {
      const i = index++;
      result[i] = await iteratee.call(
        ctx, items[i], i, items,
      );
    }).then(() => result);
}
