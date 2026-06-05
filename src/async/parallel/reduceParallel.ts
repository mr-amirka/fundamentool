import { checkNoop } from '../checkNoop';
import { loopParallel } from './loopParallel';

/**
 * Parallel asynchronous reduce over an array-like `input`.
 *
 * Iterations are scheduled in parallel with a configurable `taskLimit`.
 *
 * @param input - Source array-like collection.
 * @param iteratee - Function called for each item.
 * @param accumulator - Initial accumulator value.
 * @param ctx - Optional `this` context for the iteratee.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns A promise resolved with the final accumulator.
 * @example
 * await reduceParallel([1, 2, 3], async (acc, v) => acc + v, 0, null, 2); // => 6
 */
export function reduceParallel<T, A>(
  input: T[],
  iteratee: (this: any, acc: A, value: T, index: number, input: T[]) => A | Promise<A>,
  accumulator: A,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<A> {
  const length = input?.length || 0;
  let index = 0;

  return loopParallel(
    () => index < length && checkFn(),
    async () => {
      const i = index++;
      accumulator = await iteratee.call(ctx, accumulator, input[i], i, input);
    },
    taskLimit,
  )
    .then(() => accumulator);
}

