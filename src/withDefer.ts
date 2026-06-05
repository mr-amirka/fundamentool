import { defer } from './defer';

/**
 * Debounces a function using defer: only the last call is executed after the current tick.
 *
 * @param fn - The function to debounce.
 * @param ctx - Optional `this` context.
 * @param result - Value to return from each call (before the debounced fn runs).
 * @returns Debounced version of `fn`.
 * @example
 * const save = withDefer(() => console.log('saved'));
 * save(); save(); save(); // 'saved' printed once
 */
export function withDefer<T extends (...args: any[]) => any>(
  fn: T,
  ctx?: any,
  result?: any,
): T {
  let hasDebounce = false;
  let args: IArguments | null = null;

  function exec(): void {
    hasDebounce = false;
    if (args) fn.apply(ctx, args as any);
  }

  const wrapper = function (this: any): any {
    args = arguments;
    if (!hasDebounce) {
      hasDebounce = true;
      defer(exec);
    }
    return result;
  };
  return wrapper as T;
}
