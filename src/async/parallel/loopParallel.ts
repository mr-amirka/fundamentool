import {
  loopMap, 
} from '../../loopMap';
import {
  isLength, 
} from '../../is/isLength';
import {
  loopAsync, 
} from '../loopAsync';

/**
 * Runs `statementFn` in parallel with a maximum of `taskLimit` concurrent tasks,
 * advancing while `checkFn` returns true.
 * 
 * @param checkFn - Function to check if the loop should continue.
 * @param statementFn - Function to execute on each iteration.
 * @param taskLimit - Maximum number of concurrent tasks.
 * @returns Promise resolved when the loop completes.
 * @example
 * let i = 0;
 * await loopParallel(() => i < 6, async () => { i++; }, 3); // 3 concurrent tasks
 */
export function loopParallel(
  checkFn: () => boolean,
  statementFn: () => any,
  taskLimit: number = 1,
): Promise<any[]> {
  if (!isLength(taskLimit)) {
    throw new Error('The taskLimit must be a number');
  }
  if (taskLimit < 1) {
    throw new Error('The taskLimit must be greater than 0');
  }
  let executing = true;
  function wrappedCheck(): boolean {
    return !!(executing && (executing = checkFn() ? true : false));
  }
  return Promise
    .all(loopMap(taskLimit, () => loopAsync(wrappedCheck, statementFn)));
}

