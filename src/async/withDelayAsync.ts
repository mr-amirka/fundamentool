/**
 * Debounced async wrapper: schedules function execution after `delayMs`.
 * Returns a promise resolved with the last call result.
 * 
 * @param fn - Function to wrap.
 * @param delayMs - Delay in milliseconds.
 * @param ctx - Optional `this` context for the function.
 * @returns Wrapped debounced function that returns a Promise.
 * @example
 * const debounced = withDelayAsync(search, 300);
 * debounced('query'); // => Promise, resolves after 300ms
 */
export function withDelayAsync<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
  ctx?: any,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let hasDebounce = 0;
  let args: IArguments | null = null;
  let promise: Promise<any> = Promise.resolve();
  let timeoutId: any;
  let resolveFn: ((value: any) => void) | null = null;

  function exec(): any {
    hasDebounce = 0;
    const result = fn.apply(ctx, args as any);
    if (resolveFn) {
      resolveFn(result);
      resolveFn = null;
    }
    return result;
  }

  function initialize(resolve?: (value: any) => void): void {
    resolve && (resolveFn = resolve);
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(exec, delayMs);
  }

  return function (): Promise<ReturnType<T>> {
    args = arguments;
    if (!hasDebounce) {
      hasDebounce = 1;
      promise = new Promise<ReturnType<T>>(initialize);
    } else {
      initialize();
    }
    return promise as Promise<ReturnType<T>>;
  };
}


