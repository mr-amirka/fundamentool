const NATIVE_INCLUDES = Array.prototype.includes;

/**
 * Safe wrapper around `Array.prototype.includes` with a manual fallback.
 * 
 * @param self - The array to search in.
 * @param item - The item to search for.
 * @returns `true` if the item is present, `false` otherwise.
 * @example
 * includes([1, 2, 3], 2); // => true
 * includes(null, 1);      // => false
 */
export const includes = <T>(self: ArrayLike<T> | null | undefined, item: T): boolean =>
  self ? NATIVE_INCLUDES.call(self as any, item) : false;