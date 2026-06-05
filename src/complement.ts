import { isPlainObject } from './is/isPlainObject';
import { isObject } from './is/isObject';

export type ComplementTarget = Record<string, any> | undefined;
export type ComplementSource = Record<string, any>;

export interface IComplement {
  <TDst extends ComplementTarget, TSrc extends ComplementSource>(dst: TDst, src: TSrc, depth: number): TDst | TSrc;
  base: (dst: Record<string, any>, src: Record<string, any>, depth: number) => Record<string, any>;
}

/**
 * Fills missing keys from src into dst.
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @param depth - The depth of the object.
 * @returns The destination object.
 * @example
 * complement({ a: 1 }, { a: 99, b: 2 }, 0); // => { a: 1, b: 2 }
 */
export const complement: IComplement = <TDst extends ComplementTarget, TSrc extends ComplementSource>(
  dst: TDst,
  src: TSrc,
  depth: number = 0,
): TDst | TSrc => {
  if (depth < 0 || !isPlainObject(src)) {
    return (dst === undefined ? src : dst) as TDst | TSrc;
  }
  let target: any = dst;
  if (!isObject(target)) {
    if (target !== undefined) return target;
    target = {};
  }
  return base(target, src, depth) as any;
};

/**
 * Fills missing keys from src into dst.
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @param depth - The depth of the object.
 * @returns The destination object.
 */
const base = complement.base = (dst: Record<string, any>, src: Record<string, any>, depth: number): Record<string, any> => {
  depth--;
  const dp = depth > -1;
  // eslint-disable-next-line guard-for-in
  for (const k in src) {
    const from = src[k];
    if (from === undefined) continue;
    const to = dst[k];
    if (to === undefined) {
      if (dp && isPlainObject(from)) {
        dst[k] = base({}, from as any, depth);
      } else {
        dst[k] = from;
      }
      continue;
    }
    if (dp && isObject(to) && isPlainObject(from)) {
      base(to, from as any, depth);
    }
  }
  return dst;
};


