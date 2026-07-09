import {
  getImageByUrl, 
} from './getImageByUrl';

/**
 * Loads an image by URL and resolves with its natural size.
 *
 * @param url - Image source URL.
 * @returns Promise resolved with a tuple `[width, height]`.
 * @example
 * const [w, h] = await getImageNaturalSizeByUrl('https://example.com/img.png');
 */
export const getImageNaturalSizeByUrl =(url: string): Promise<[
  width: number,
  height: number,
]> => getImageByUrl(url).then(imageToSize);

const imageToSize = (img: HTMLImageElement): [
  width: number,
  height: number,
] => [img.naturalWidth || img.width || 0, img.naturalHeight || img.height || 0];