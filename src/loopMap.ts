import {
  isFunction, 
} from './is/isFunction';
import {
  wrapper, 
} from './wrapper';

/**
 * Maps indices [i, length) to values using provided function.
 *
 * If `fn` is not a function, wraps it with `wrapper(fn)`.
 * 
 * @param length - The length of the loop.
 * @param fn - The function to call for each index.
 * @param output - The output array to write the values to.
 * @returns The output array.
 * @example
 * loopMap(10, (index) => index * 2); // => [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
 */
export const loopMap = <T = any>(
  length: number,
  fn: ((index: number) => T) | any,
  output?: T[],
): T[] => {
  const mapper = isFunction(fn) ? fn : wrapper(fn);
  const result: T[] = output || new Array(length);
  let i = 0;
  for (; i < length; i++) {
    result[i] = mapper(i);
  }
  return result;
};
