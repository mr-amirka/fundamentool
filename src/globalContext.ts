/* eslint-disable no-undef */

import {
  executeTry, 
} from './executeTry';

/**
 * Unified access to the global object in any environment.
 * 
 * @returns The global object (`globalThis`, `window`, `self`, or `global`).
 * @example
 * GLOBAL_CONTEXT.setTimeout(() => {}, 0);
 */
export const GLOBAL_CONTEXT =
  executeTry(() => globalThis)
  || executeTry(() => window)
  || executeTry(() => self)
  || executeTry(() => global)
  || (function() {
    return this; 
  })();