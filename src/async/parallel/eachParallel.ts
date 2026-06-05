import { isArray } from '../../is/isArray';
import { forEachParallel } from './forEachParallel';
import { forInParallel } from './forInParallel';
import { checkNoop } from '../checkNoop';

/**
 * Chooses parallel iterator (`forEach` for arrays, `forIn` for objects via `forInParallel`)
 * and runs it. This is a thin facade mirroring the old JS behaviour.
 * 
 * @param collection - Source array or object.
 * @param iteratee - Iteration function.
 * @param ctx - Optional `this` context.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the input collection.
 * @example
 * await eachParallel([1, 2, 3], async (v) => process(v), null, 2); // 2 concurrent
 */
export function eachParallel<A extends any[] | Record<string, any>>(
  collection: A,
  iteratee: (this: any, value: A[keyof A], key: string | number, collection: A) => any,
  ctx?: any,
  taskLimit?: number,
  checkFn: () => boolean = checkNoop,
): Promise<A> {
  return (isArray(collection) ? forEachParallel : forInParallel as any)(
    collection, iteratee, ctx, taskLimit, checkFn
  );
}

