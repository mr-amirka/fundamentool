/**
 * Wraps a function so that it always returns the given constant result.
 *
 * The original function is still executed for its side effects.
 *
 * @param fn - The function to call for side effects.
 * @param result - The fixed return value.
 * @param ctx - Optional `this` context.
 * @returns Wrapper that always returns `result`.
 * @example
 * const handler = withResult(e => e.preventDefault(), false);
 * handler(event); // => false
 */
export function withResult<T extends (...args: any[]) => any, R>(
  fn: T,
  result: R,
  ctx?: any,
): (...args: Parameters<T>) => R {
  return function withResultWrapper(this: any, ...args: Parameters<T>): R {
    fn.apply(ctx ?? this, args);
    return result;
  };
}

