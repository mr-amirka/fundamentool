import {
  hasOwn, 
} from './hasOwn';

/**
 * Shallowly copies own enumerable properties from `src` to `dst`.
 * Mutates and returns `dst`.
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @returns The destination object.
 * @example
 * extendOwn({ a: 1 }, { b: 2 }); // => { a: 1, b: 2 }
 */
export function extendOwn<TDst extends Record<string, any>, TSrc extends Record<string, any>>(dst: TDst,
  src: TSrc): TDst & TSrc {
  let k: keyof typeof src;
  for (k in src) {
    if (hasOwn(src, k)) {
      (dst as any)[k] = src[k];
    }
  }
  return dst as TDst & TSrc;
}

