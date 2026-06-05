/**
 * Reads a `Blob` and resolves with a base64 data URL string.
 *
 * @param blob - The Blob to convert.
 * @returns Promise resolved with a base64 data URL string.
 * @example
 * const dataUrl = await convertBlobToBase64(new Blob(['hello']));
 */
export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
