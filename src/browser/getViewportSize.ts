import {
  getViewportSizeProvider, 
} from '../getViewportSizeProvider';

declare const window: Window;

/**
 * Gets viewport size for the current `window`.
 *
 * @returns `{ width, height }` of the current viewport.
 * @example
 * const { width, height } = getViewportSize();
 */
export const getViewportSize = getViewportSizeProvider(window);
