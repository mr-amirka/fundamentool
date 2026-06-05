import { asAsync } from '../asAsync';
import { createTimeout } from '../createTimeout';
import { noop } from '../noop';

/**
 * Runs `fn` periodically with the given delay.
 *
 * If `fn` returns a promise, the next tick is scheduled after it settles.
 * Returns a cancel function that stops subsequent executions.
 * 
 * @param fn - Function to execute periodically.
 * @param delayMs - Delay in milliseconds.
 * @param args - Arguments to pass to the function.
 * @param self - Optional `this` context.
 * @returns A cancel function that stops subsequent executions.
 * @example
 * const stop = intervalAsync(() => fetch('/ping'), 5000);
 * stop(); // cancels further executions
 */
export function intervalAsync(
  fn: (...args: any[]) => any,
  delayMs: number = 0,
  args?: ArrayLike<any> | null,
  self?: any,
): () => void {
  let cancelFn = noop;

  function callFn(): void {
    return fn.apply(self, args || []);
  }

  function next(): void {
    asAsync(callFn).then(lazyNext, lazyNext);
  }

  function lazyNext(): void {
    cancelFn = createTimeout(next, delayMs);
  }

  lazyNext();

  return () => {
    cancelFn();
  };
}
