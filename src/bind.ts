
/**
 * Like `Function.prototype.bind` but accepts pre-bound args as an array.
 *
 * @param fn - Function to bind.
 * @param ctx - `this` context.
 * @param args - Optional array of arguments to prepend on each call.
 * @returns Bound function that prepends `args` before runtime arguments.
 * @example
 * const log = bind(console.log, console, ['info:']);
 * log('Hello'); // console.log('info:', 'Hello')
 */
export function bind<F extends (...args: any[]) => any>(
  fn: F,
  ctx: any,
  args?: any[],
): (...rest: any[]) => ReturnType<F> {
  const baseArgs = [...(args || [])];
  return function bound(this: any, ...rest: any[]): ReturnType<F> {
    return fn.apply(ctx, [...baseArgs, ...rest]) as ReturnType<F>;
  };
}

