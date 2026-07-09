/**
 * Creates a blob URL for the given content and MIME type using the native `Blob` constructor.
 *
 * This function replaces the legacy `blob/from` helper by using the native
 * `Blob` constructor directly.
 *
 * @param content - Data to wrap into a `Blob`. Can be a string, `ArrayBuffer`, `BlobPart`, etc.
 * @param type - Optional MIME type for the created blob.
 * @returns A blob URL string created via `URL.createObjectURL`.
 * @example
 * const url = getDataLink('hello', 'text/plain'); // => 'blob:...'
 */
export function getDataLink(content: BlobPart | BlobPart[] | ArrayBuffer, type?: string): string {
  const blob = new Blob(Array.isArray(content) ? content : [content],
    type ? {
      type, 
    } : undefined);
  return URL.createObjectURL(blob);
}
