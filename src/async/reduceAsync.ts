import {
  checkNoop, 
} from './checkNoop';
import {
  loopAsync, 
} from './loopAsync';

/**
 * Asynchronously reduces an array-like `items` from left to right.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 *
 * @param items - Source array-like collection.
 * @param iteratee - Reducer function, may return a value or a promise.
 * @param accumulator - Initial accumulator value.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the final accumulator.
 * @example
 * await reduceAsync([1, 2, 3], async (acc, v) => acc + v, 0); // => 6
 */
export function reduceAsync<T, A>(
  items: T[],
  iteratee: (this: any, acc: A, value: T, index: number, items: T[]) => A | Promise<A>,
  accumulator: A,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<A> {
  const length = items?.length || 0;
  let index = 0;

  return loopAsync(() => index < length && checkFn(),
    async () => {
      const i = index++;
      accumulator = await iteratee.call(
        ctx, accumulator, items[i], i, items,
      );
    })
    .then(() => accumulator);
}


