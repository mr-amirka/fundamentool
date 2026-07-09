import {
  isIE, 
} from './isIE';

/**
 * Returns `true` when `document.readyState` is in interactive or complete state.
 * In IE uses strict `'complete'` check; in other browsers allows `'interactive'`.
 *
 * @param window - The window object to check against.
 * @returns `true` if the document is ready.
 * @example
 * isDocumentStateReady(window); // => true (when DOM is ready)
 */
export const isDocumentStateReady = (window: any): boolean => {
  const s = window.document.readyState;
  return isIE(window) ? s === 'complete' : /complete|interactive/.test(s);
};

