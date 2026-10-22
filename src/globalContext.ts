/* eslint-disable no-undef */

import {
  executeTry,
} from './executeTry';

/* istanbul ignore next -- for runtimes without `globalThis` (older browsers, old Node); every runtime the tests run
   in has it */
function fallbackContext(): any {
  return executeTry(() => window)
    || executeTry(() => self)
    || executeTry(() => global)
    || (function(this: any) {
      return this;
    })();
}

/**
 * Unified access to the global object in any environment.
 *
 * @returns The global object (`globalThis`, `window`, `self`, or `global`).
 * @example
 * GLOBAL_CONTEXT.setTimeout(() => {}, 0);
 */
export const GLOBAL_CONTEXT = executeTry(() => globalThis) || fallbackContext();
