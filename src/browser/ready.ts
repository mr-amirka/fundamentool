import {
  readyProvider, 
} from '../readyProvider';

declare const window: Window;

/**
 * DOM ready helper for the current `window`.
 * Executes the callback immediately if the document is already ready,
 * or queues it until it becomes ready.
 *
 * @param callback - Function to call when the DOM is ready.
 * @example
 * ready(() => console.log('DOM is ready'));
 */
export const ready = readyProvider(window);
