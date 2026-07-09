import {
  createTimeout, 
} from './createTimeout';

declare function setImmediate(handler: (...args: any[]) => void, ...args: any[]): any;
declare function clearImmediate(handle: any): void;

type Fn = ((...args: any[]) => any) | null | 0;

/**
 * Schedules function execution as soon as possible using `setImmediate`,
 * with a fallback to `delay` when `setImmediate` is not available.
 * 
 * @param fn - The function to defer.
 * @param args - The arguments to pass to the function.
 * @param ctx - The context to pass to the function.
 * @returns A function that cancels the deferred execution when called.
 * @example
 * const cancel = defer(() => console.log('hi'));
 * cancel(); // cancels before it runs
 */
export const defer = (
  fn: Fn,
  args?: ArrayLike<any> | null,
  ctx?: any,
): () => void => {
  try {
    const base = () => {
      const _fn: Fn = fn;
      if (_fn) {
        fn = 0;
        _fn.apply(ctx, args || []);
      }
    };
    const _t1 = setImmediate(base);
    return () => {
      fn = 0;
      clearImmediate(_t1);
    };
  } catch {
    return createTimeout(
fn as any, 0, args, ctx,
    );
  }
};
