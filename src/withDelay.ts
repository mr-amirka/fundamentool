import { createTimeout } from './createTimeout';

/**
 * Debounces a function: only the last call within the delay window is executed.
 *
 * @param fn - The function to debounce.
 * @param delayMs - Debounce window in milliseconds.
 * @param ctx - Optional `this` context.
 * @param result - Value to return from each call (before the debounced fn runs).
 * @returns Debounced version of `fn`.
 * @example
 * const search = withDelay(query => fetch(query), 300);
 * search('a'); search('ab'); search('abc'); // only search('abc') runs
 */
export function withDelay<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
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
      createTimeout(exec, delayMs);
    }
    return result;
  };
  return wrapper as T;
}
