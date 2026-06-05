import { extend } from './extend';
import { isPlainObject } from './is/isPlainObject';
import { isObject } from './is/isObject';
import { get } from './get';
import { set } from './set';

/**
 * Extends `dst` from `src` according to a map of paths.
 *
 * Map shape: { toPath: fromPath | '' }.
 * Empty `fromPath` means copy whole `src` (optionally shallow‑extend).
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @param map - The map of paths.
 * @returns The destination object.
 * @example
 * extendByPathsMap({}, { user: { name: 'Ann' } }, { 'name': 'user.name' });
 * // => { name: 'Ann' }
 */
export const extendByPathsMap = (
  dst: Record<string, any>,
  src: Record<string, any>,
  map?: Record<string, string>,
): Record<string, any> => {
  if (!map) return dst;
  if (!isObject(map)) return get(src, map);

  let to: string;
  let from: string;
  let v: any;

  // eslint-disable-next-line guard-for-in
  for (to in map) {
    from = map[to];
    v = from === '' ? src : get(src, from);
    if (v === undefined) continue;
    if (to) {
      set(dst, to, v);
    } else if (isPlainObject(v)) {
      extend(dst, v);
    }
  }
  return dst;
};

