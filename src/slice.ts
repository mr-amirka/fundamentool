export const NATIVE_SLICE = [].slice;

/**
 * Slices an array-like collection.
 * 
 * @param self - The array-like collection to slice.
 * @param start - The start index.
 * @param end - The end index.
 * @returns The sliced array.
 * @example
 * slice([1, 2, 3, 4], 1);    // => [2, 3, 4]
 * slice([1, 2, 3, 4], 1, 3); // => [2, 3]
 */
export function slice(
  self: ArrayLike<any>, start?: number, end?: number,
): any[] {
  return NATIVE_SLICE.call(
    self, start, end,
  );
}