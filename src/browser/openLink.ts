import {
  wait, 
} from '../wait';
/**
 * Opens the given URL in a new browser tab using a temporary `<a>` element.
 * Returns a Promise that resolves after a short timeout, useful for tests
 * or when waiting for the navigation to be scheduled.
 *
 * @param url - URL to open.
 * @param timeout - Timeout in ms before the promise resolves (default: 100).
 * @returns Promise resolved after the given timeout.
 * @example
 * await openLink('https://example.com'); // opens in new tab
 */
export const openLink = (url: string, timeout?: number): Promise<void> => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.click();
  return wait(timeout ?? 100);
};
