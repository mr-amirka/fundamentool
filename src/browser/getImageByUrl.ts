/**
 * Loads an image from the given URL and resolves with the created `Image` element.
 *
 * @param url - Image source URL.
 * @returns Promise resolved with the loaded `HTMLImageElement`.
 * @example
 * const img = await getImageByUrl('https://example.com/img.png');
 * img.naturalWidth; // => 800
 */
export function getImageByUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve: (img: HTMLImageElement) => void, reject: (reason?: any) => void) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = reject;
    image.src = url;
  });
}
