import {
  getImageByUrl, 
} from './getImageByUrl';

export interface IGetBase64ImageOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  /**
   * MIME type of resulting image, for example `image/png` or `image/jpeg`.
   * Defaults to `image/png`.
   */
  type?: string;
}

/**
 * Loads an image by URL and converts it to a base64 data URL using a canvas.
 *
 * @param url - Image source URL.
 * @param options - Optional rendering options such as size, crop position and MIME type.
 * @returns Promise resolved with the generated data URL string.
 * @example
 * const dataUrl = await getBase64Image('https://example.com/img.png');
 */
export function getBase64Image(url: string,
  options: IGetBase64ImageOptions = {}): Promise<string> {
  return getImageByUrl(url).then((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || img.naturalWidth || img.width || 0;
    canvas.height = options.height || img.naturalHeight || img.height || 0;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context is not available.');
    }

    ctx.drawImage(
      img, options.left || 0, options.top || 0,
    );
    return canvas.toDataURL(options.type || 'image/png');
  });
}