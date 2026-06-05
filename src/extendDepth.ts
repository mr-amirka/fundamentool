import { isPlainObject } from './is/isPlainObject';
import { isObject } from './is/isObject';

interface IExtendDepth {
  /**
   * Deeply extends `dst` with `src` up to `depth` levels.
   * 
   * @param dst - The destination object.
   * @param src - The source object.
   * @param depth - The depth to extend to.
   * @returns The extended object.
   */
  <T>(dst: T, src: T, depth: number): T;
  /**
   * Deeply extends `dst` with `src` up to `depth` levels.
   * 
   * @param dst - The destination object.
   * @param src - The source object.
   * @param depth - The depth to extend to.
   * @returns The extended object.
   */
  base: <T>(dst: T, src: T, depth: number) => T;
}

/**
 * @example
 * extendDepth({ a: { x: 1 } }, { a: { y: 2 } }, 1); // => { a: { x: 1, y: 2 } }
 */
export const extendDepth: IExtendDepth = <T extends Record<string, any>>(dst: T, src: T, depth: number = 0): T => {
  if (src === undefined) return dst;
  if (depth < 0 || !isPlainObject(src)) return src;
  return base(isObject(dst) ? dst : ({} as T), src, depth) as T;
};

const base = extendDepth.base = <T extends Record<string, any>>(dst: T, src: T, depth: number): T => {
  depth--;
  const deep = depth > -1;
  let k: keyof typeof src;
  let from: any;
  let to: any;
  for (k in src) {
    from = src[k];
    if (from === undefined) continue;
    if (deep && isPlainObject(from)) {
      to = dst[k];
      base(isObject(to) ? to : (dst[k] = {} as T[keyof T]), from, depth);
      continue;
    }
    dst[k] = from;
  }
  return dst;
};

