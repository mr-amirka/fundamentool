/**
 * Copies properties from `src` to `dst` only if the key in `dst` is falsy.
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @returns The destination object.
 * @example
 * extendIfEmpty({ a: 1, b: 0 }, { b: 99, c: 3 }); // => { a: 1, b: 99, c: 3 }
 */
export const extendIfEmpty = (dst: Record<string, any>, src: Record<string, any>): typeof dst => {
  let k: keyof typeof src;
  for (k in src) {
    if (!dst[k]) {
      dst[k] = src[k];
    }
  }
  return dst;
};

