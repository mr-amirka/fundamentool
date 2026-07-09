import {
  isArray, 
} from '../is/isArray';
import {
  checkNoop, 
} from './checkNoop';
import {
  forEachAsync, 
} from './forEachAsync';
import {
  forInAsync, 
} from './forInAsync';
  
/**
 * Chooses async iterator (`forEach` for arrays, `forIn` for objects) and runs it.
 *
 * @param collection - Array or object to iterate.
 * @param iteratee - Iteration function.
 * @param ctx - Optional `this` context.
 * @param checkFn - Optional function to additionally control loop continuation.
 * @returns Promise resolved with the input collection after all items are processed.
 * @example
 * await eachAsync([1, 2], async (v) => console.log(v)); // logs 1, 2
 */
export function eachAsync<A extends (any[] | Record<string, any>)>(
  collection: A,
  iteratee: (this: any, value: A[keyof A], key: string | number, collection: A) => any,
  ctx?: any,
  checkFn: () => boolean = checkNoop,
): Promise<A> {

  return ((isArray(collection) ? forEachAsync : forInAsync) as any)(
    collection, iteratee, ctx, checkFn,
  ) as Promise<A>;
}

