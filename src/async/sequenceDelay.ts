import { noop } from '../noop';
import { wait } from '../wait';

/**
 * Like `sequence`, but adds a delay before each execution.
 * 
 * @param fn - Function to wrap.
 * @param delayMs - Delay in milliseconds.
 * @param ctx - Optional `this` context for the function.
 * @returns Wrapped function that returns a Promise.
 * @example
 * const delayedSave = sequenceDelay(save, 300);
 * delayedSave(); // waits 300ms before executing, queues subsequent calls
 */
export function sequenceDelay<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
  ctx?: any,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let promise: Promise<any> = Promise.resolve();
  return function(): Promise<ReturnType<T>> {
    const self = ctx || this;
    const args = arguments;
    promise = promise
      .catch(noop)
      .then(() => wait(delayMs))
      .then(() => fn.apply(self, args));
    return promise as Promise<ReturnType<T>>;
  };
}