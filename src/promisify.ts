import { isFunction } from './is/isFunction';

/**
 * Wraps node‑style callback function into Promise‑based one.
 * 
 * @param fn - The function to wrap.
 * @param PromiseCtor - The Promise constructor to use.
 * @returns The wrapped function.
 * @example
 * const fn = promisify((callback) => callback(null, 'hello'));
 * fn().then((result) => console.log(result)); // => 'hello'
 */
export const promisify = <F extends (...args: any[]) => any>(
  fn: F,
  PromiseCtor?: PromiseConstructor,
) => {
  const _Promise: PromiseConstructor = isFunction(PromiseCtor)
    ? (PromiseCtor as any)
    : Promise;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function wrapped(this: any, ...args: any[]): Promise<any>;
  function wrapped(this: any): Promise<any> {
    const self = this;
    const l = arguments.length;
    const args = new Array(l + 1);
    let i = 0;
    for (; i < l; i++) args[i] = arguments[i];
    return new _Promise((resolve, reject) => {
      args[l] = (error: any, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };
      fn.apply(self, args);
    });
  }
  return wrapped;
};

