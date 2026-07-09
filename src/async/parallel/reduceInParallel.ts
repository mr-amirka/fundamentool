import {
  entries, 
} from '../../entries';
import {
  checkNoop, 
} from '../checkNoop';
import {
  loopParallel, 
} from './loopParallel';

/**
 * Parallel asynchronous reduce over array or object.
 *
 * @param collection - Source object.
 * @param iteratee - Reducer function.
 * @param accumulator - Initial accumulator value.
 * @param ctx - Optional `this` context for the iteratee.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the final accumulator.
 * @example
 * await reduceInParallel({ a: 1, b: 2 }, async (acc, v) => acc + v, 0, null, 2); // => 3
 */
export function reduceInParallel<T, A>(
  collection: Record<string, T>,
  iteratee: (this: any, acc: A, value: T, key: string, collection: Record<string, T>) => A | Promise<A>,
  accumulator: A,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<A> {
  const pairs = entries(collection) as [string, T][];
  const length = pairs.length;
  let index = 0;

  return loopParallel(
    () => index < length && checkFn(),
    async () => {
      const i = index++;
      const [key, value] = pairs[i];
      accumulator = await iteratee.call(
        ctx, accumulator, value, key, collection as Record<string, T>,
      );
    },
    taskLimit,
  ).then(() => accumulator);
}