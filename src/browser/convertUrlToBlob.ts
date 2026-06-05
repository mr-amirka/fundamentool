/**
 * Fetches a URL and resolves with its response body as a `Blob`.
 *
 * @param url - Resource URL.
 * @returns Promise resolved with a `Blob`.
 * @example
 * const blob = await convertUrlToBlob('https://example.com/img.png');
 */
export const convertUrlToBlob = (url: string): Promise<Blob> => {
  return fetch(url, {
    method: 'GET',
    cache: 'no-cache',
  }).then((response) => response.blob());
};
