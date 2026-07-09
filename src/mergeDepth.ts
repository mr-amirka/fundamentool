import {
  extendDepth, 
} from './extendDepth';

/**
 * Merges multiple sources into a destination up to `depth` levels.
 * Mirrors old mn-utils `mergeDepth(sources, dst, depth)` API.
 *
 * @param sources - Array of source objects to merge.
 * @param dst - Destination object.
 * @param depth - Maximum depth of merging (1 = shallow).
 * @returns The destination object.
 * @example
 * mergeDepth([{ a: { x: 1 } }, { a: { y: 2 } }], {}, 2); // => { a: { x: 1, y: 2 } }
 */
export const mergeDepth = (
  sources: any[], dst: any, depth: number,
): any => {
  const l = sources.length;
  let i = 0;
  for (; i < l; i++) {
    (extendDepth as any).base(
      dst, sources[i], depth,
    );
  }
  return dst;
};
