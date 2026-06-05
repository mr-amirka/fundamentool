import { entries } from '../entries';
import { checkNoop } from './checkNoop';
import { loopAsync } from './loopAsync';

/**
 * Asynchronous reduce over object.
 *
 * Expects `iteratee` to be a function; shorthand/normalize logic is removed.
 *
 * @param collection - Array or object to reduce.
 * @param iteratee - Async-friendly reducer function.
 * @param accumulator - Initial accumulator value.
 * @param ctx - Optional `this` context for the iteratee.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the final accumulator.
 * @example
 * await reduceInAsync({ a: 1, b: 2 }, async (acc, v) => acc + v, 0); // => 3
 */
export function reduceInAsync<T, A>(
  collection: Record<string, T>,
  iteratee: (this: any, acc: A, value: T, key: string, collection: Record<string, T>) => A | Promise<A>,
  accumulator: A,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<A> {
  const pairs = entries(collection) as [string, T][];
  const length = pairs.length;
  let index = 0;

  return loopAsync(
    () => index < length && checkFn(),
    async () => {
      const [key, value] = pairs[index++];
      accumulator = await iteratee.call(ctx, accumulator, value, key, collection);
    },
  ).then(() => accumulator);
}

