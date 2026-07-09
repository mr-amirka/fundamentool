import {
  isArrayLike, 
} from './is/isArrayLike';
import {
  each, 
} from './each';

type TFn = (...args: any[]) => any;

/**
 * Applies all functions from `funcs` with the same args and context.
 * 
 * @param funcs - The functions to apply.
 * @param args - The arguments to pass to the functions.
 * @param context - The context to pass to the functions.
 * @returns void
 * @example
 * eachApply([Math.max, Math.min], [3, 1, 2]); // Math.max(3,1,2), Math.min(3,1,2)
 */
export const eachApply = <T extends TFn[] | Record<string, TFn>>(
  funcs: T,
  args?: any[],
  context?: any,
): void => {
  const ctx = context || null;
  const callArgs = args || [];
  each(
    funcs,
    (fn: TFn) => {
      fn.apply(ctx, callArgs);
    },
    isArrayLike(funcs),
  );
};

