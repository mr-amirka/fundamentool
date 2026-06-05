import { isArray } from './is/isArray';
import { isObject } from './is/isObject';

interface ICloneDepth {
  <T>(src: T, depth: number): T;
  base: <T>(src: T, depth: number) => T;
}

/**
 * Clones an object up to a given depth.
 * 
 * @param src - The object to clone.
 * @param depth - The depth to clone to.
 * @returns The cloned object.
 * @example
 * cloneDepth({ a: { b: 1 } }, 1); // => { a: { b: 1 } } (shallow at depth 1)
 * cloneDepth([1, [2, 3]], 0);      // => [1, [2, 3]] (reference, depth 0)
 */
export const cloneDepth: ICloneDepth = <T>(src: T, depth: number = 0): T => base(src, depth);

const base = cloneDepth.base = <T>(src: T, depth: number): T => {
  if (depth < 0) return src;
  depth--;
  if (isObject(src)) {
    if (isArray(src)) {
      const arr = src as any[];
      const dst: any[] = new Array(arr.length);
      for (let k = arr.length; k--;) {
        dst[k] = base(arr[k], depth);
      }
      return dst as any;
    }
    const srcObj = src as any;
    const dst: any = {};
    // eslint-disable-next-line guard-for-in
    for (const k in srcObj) {
      dst[k] = base(srcObj[k], depth);
    }
    return dst;
  }
  return src;
}

