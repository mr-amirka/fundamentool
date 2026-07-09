import {
  noop, 
} from '../noop';

/**
 * Wraps function so that calls are executed sequentially: each waits for the previous.
 * @param fn - Function to wrap.
 * @param ctx - Optional `this` context for the function.
 * @returns Wrapped function that returns a Promise.
 * @example
 * const seq = sequence(fetchData);
 * seq(); // first call starts immediately
 * seq(); // waits for first to finish, then runs
 */
export function sequence<T extends (...args: any[]) => any>(fn: T,
  ctx?: any): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let promise: Promise<any> = Promise.resolve();
  return function(): Promise<ReturnType<T>> {
    const self = ctx || this;
    const args = arguments;
    promise = promise
      .catch(noop)
      .then(() => fn.apply(self, args));
    return promise as Promise<ReturnType<T>>;
  };
}

