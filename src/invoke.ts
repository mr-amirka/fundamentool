import { getWithContext } from './get';
import { isArrayLike } from './is/isArrayLike';
import { getKeyPath } from './getKeyPath';

/**
 * Invokes a function by path in the scope.
 * 
 * @param scope - The scope to invoke the function in.
 * @param path - The path to the function.
 * @param args - The arguments to pass to the function.
 * @param ctx - The context to use for the function.
 * @returns The result of the function.
 */
export const invokeBase = (
  scope: any,
  path: ArrayLike<string>,
  args?: any[],
  ctx?: any,
): any => {
  const result = getWithContext(scope, path);
  const fn = result?.[1];
  if (fn) {
    return fn.apply(ctx || result[0], args || []);
  }
};

/**
 * Invokes a function by path in the scope.
 * 
 * @param scope - The scope to invoke the function in.
 * @param path - The path to the function.
 * @param args - The arguments to pass to the function.
 * @param ctx - The context to use for the function.
 * @returns The result of the function.
 * @example
 * invoke({ fn: (x: number) => x * 2 }, 'fn', [5]); // => 10
 */
export const invoke = (
  scope: any,
  path: ArrayLike<string> | string | number,
  args?: any[],
  ctx?: any,
): any => invokeBase(
  scope,
  isArrayLike(path) ? (path as ArrayLike<string>) : getKeyPath('' + path),
  args,
  ctx,
);
