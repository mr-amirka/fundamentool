import {
  createTimeout, 
} from './createTimeout';
import {
  single, 
} from './single';

/**
 * Wraps a function so each invocation resets the delay; previous pending call is cancelled.
 *
 * @param fn - The function to debounce.
 * @param delayMs - Delay window in milliseconds.
 * @param ctx - Optional `this` context.
 * @returns Debounced function with a `cancel()` method.
 * @example
 * const save = withReDelay(() => console.log('saved'), 500);
 * save(); save(); // timer resets; 'saved' runs 500ms after the last call
 */
export function withReDelay<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
  ctx?: any,
): T & { cancel: () => void } {
  return single(function (this: any) {
    return createTimeout(
      fn, delayMs, arguments as any, ctx,
    );
  }, ctx) as T & { cancel: () => void };
}
