/**
 * Wraps a function so that concurrent invocations are ignored while one is running.
 *
 * @param fn - The function to protect.
 * @param ctx - Optional `this` context.
 * @param result - Value to return for ignored calls.
 * @returns Locked version of `fn`.
 * @example
 * const handleClick = withLock(() => expensiveOp());
 * handleClick(); handleClick(); // second call is ignored while first runs
 */
export function withLock<T extends (...args: any[]) => any>(
  fn: T,
  ctx?: any,
  result?: any,
): T {
  let locked = false;
  const wrapper = function (this: any): any {
    if (!locked) {
      locked = true;
      try {
        fn.apply(ctx || this, arguments as any);
      } finally {
        locked = false;
      }
    }
    return result;
  };
  return wrapper as T;
}
