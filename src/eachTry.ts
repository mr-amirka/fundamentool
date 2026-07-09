import {
  isArrayLike, 
} from './is/isArrayLike';
import {
  executeTry, 
} from './executeTry';
import {
  each, 
} from './each';

/**
 * Executes all functions with shared args/context, catching errors via `onError`.
 *
 * @param funcs - Array or object of functions to call.
 * @param args - Arguments forwarded to each function.
 * @param context - Optional `this` context.
 * @param onError - Optional error handler called if a function throws.
 * @returns void
 * @example
 * eachTry([fn1, fn2], [arg], null, err => console.error(err));
 */
export const eachTry = (
  funcs: any,
  args?: any[],
  context?: any,
  onError?: (err: unknown) => void,
): void => {
  const ctx = context || null;
  const callArgs = args || [];
  each(
    funcs,
    (fn: (...a: any[]) => any) => {
      executeTry(
        fn, callArgs, ctx, onError,
      );
    },
    isArrayLike(funcs),
  );
};

