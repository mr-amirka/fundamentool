import { convertUrlToBlob } from './convertUrlToBlob';
import { convertBlobToBase64 } from './convertBlobToBase64';

/**
 * Converts a URL to a base64 data URL.
 *
 * Implementation: `URL -> Blob -> base64`.
 *
 * @param url - Resource URL.
 * @returns Promise resolved with a base64 data URL string.
 * @example
 * const base64 = await convertUrlToBase64('https://example.com/img.png');
 */
export const convertUrlToBase64 = (url: string): Promise<string> => {
  return convertUrlToBlob(url).then(convertBlobToBase64);
};
