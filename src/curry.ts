export type CurryFn<F extends (...args: any[]) => any> = (...args: any[]) => ReturnType<F>;

/**
 * Curries a function.
 * 
 * @param fn - The function to curry.
 * @param ctx - The context to curry the function with.
 * @returns The curried function.
 * @example
 * const add = curry((a: number, b: number) => a + b);
 * const add5 = add(5);
 * add5(3); // => 8
 */
export const curry = <F extends (...args: any[]) => any>(fn: F, ctx?: any): CurryFn<F> => {
  const length = fn.length;

  function base(args: any[]): any {
    return function () {
      const _args = [...args, ...arguments];
      return _args.length >= length
        ? fn.apply(ctx || this, _args)
        : base(_args);
    };
  }

  return base([]);
};