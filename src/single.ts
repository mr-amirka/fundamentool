import {
  isFunction, 
} from './is/isFunction';
import {
  isPromise, 
} from './is/isPromise';

/**
 * Wraps a function so that each new invocation cancels the previous one.
 * The wrapped function returns a cancel handle (function or promise with .cancel).
 * 
 * @param fn - The function to wrap.
 * @param ctx - The context to wrap the function in.
 * @returns The wrapped function.
 * @example
 * const singleFunc = single(() => console.log('single'));
 * singleFunc(); // => 'single'
 * singleFunc();
 */
export function single<T extends (...args: any[]) => any>(fn: T,
  ctx?: any): T & { cancel: () => void } {
  let innerCancel: any;

  function instance(this: any): any {
    cancel();
    innerCancel = fn.apply(ctx, arguments);
    return innerCancel;
  }

  function cancel(): void {
    const currentCancel = innerCancel;
    innerCancel = 0;
    if (currentCancel) {
      if (isFunction(currentCancel)) {
        currentCancel();
      } else if (isPromise(currentCancel) && isFunction((currentCancel as any).cancel)) {
        (currentCancel as any).cancel();
      }
    }
  }

  (instance as any).cancel = cancel;
  return instance as T & { cancel: () => void };
}
