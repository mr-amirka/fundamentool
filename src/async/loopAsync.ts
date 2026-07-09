import {
  asAsync, 
} from '../asAsync';

/**
 * Asynchronous loop helper that repeatedly calls `statementFn` while `checkFn` is true.
 *
 * @param checkFn - Function to check if the loop should continue.
 * @param statementFn - Function to execute on each iteration.
 * @returns Promise resolved when the loop completes.
 * @example
 * let i = 0;
 * await loopAsync(() => i < 3, async () => { i++; }); // i === 3
 */
export function loopAsync(checkFn: () => boolean,
  statementFn: () => any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function next() {
      try {
        checkFn()
          ? asAsync(statementFn).then(next, reject)
          : resolve();
      } catch (ex) {
        reject(ex);
      }
    }
    next();
  });
}
