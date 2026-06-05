import { noop } from './noop';

/**
 * Wraps async workflow so that `callback` is called when internal counter drops to zero.
 *
 * `fn(inc, dec)` should call `inc()` when starting an async task and `dec()` when it finishes.
 * 
 * @param fn - The function to wrap.
 * @param callback - The callback to call when the counter drops to zero.
 * @returns void
 * @example
 * finallyAll((inc, dec) => {
 *   inc(); fetch('/a').finally(dec);
 *   inc(); fetch('/b').finally(dec);
 * }, () => console.log('all done'));
 */
export const finallyAll = (
  fn: (inc: () => void, dec: () => void) => void,
  callback?: () => void,
): void => {
  let count = 0;
  const done = callback || noop;

  fn(
    () => {
      count++;
    },
    () => {
      count--;
      if (count <= 0) {
        done();
      }
    },
  );
};

