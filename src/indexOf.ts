const NATIVE_INDEX_OF = Array.prototype.indexOf;

/**
 * Safe wrapper around `Array.prototype.indexOf` with a manual fallback.
 * 
 * @param collection - The array to search in.
 * @param v - The item to search for.
 * @returns The index of the item, or `-1` if not found.
 * @example
 * indexOf([10, 20, 30], 20); // => 1
 * indexOf([10, 20], 99);     // => -1
 */
export const indexOf = <T>(
  collection: ArrayLike<T> | null | undefined,
  v: T,
): number => NATIVE_INDEX_OF.call(collection, v);

