export const NATIVE_PUSH = Array.prototype.push;

/**
 * Pushes an array into another array.
 * 
 * @param dst - The destination array.
 * @param src - The source array.
 * @returns The destination array.
 * @example
 * const dst = [1, 2];
 * pushArray(dst, [3, 4]); // => [1, 2, 3, 4]
 */
export const pushArray = (dst: ArrayLike<any>, src: ArrayLike<any>) => {
  NATIVE_PUSH.apply(dst, src as any);
  return dst;
};
