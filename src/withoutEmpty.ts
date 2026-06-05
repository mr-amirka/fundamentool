
/**
 * Recursively removes null, undefined, empty-string and empty-array values.
 *
 * @param data - The value to clean.
 * @param depth - How many levels deep to recurse (default 0 = shallow).
 * @returns Cleaned value, or `null` if the entire value was empty.
 * @example
 * withoutEmpty({ a: 1, b: null, c: '' }); // => { a: 1 }
 * withoutEmpty({ a: { b: null } }, 1);    // => null
 */
export const withoutEmpty = (data: any, depth?: number) => withoutEmptyBase(data, depth || 0);

export const withoutEmptyBase = (src: any, depth: number): any => {
  if (depth < 0) return src;
  depth--;
  const type = typeof src;
  let dst: any = null,
    v: any,
    k: string;
  if (src === null || src === undefined || (type === 'string' && !src)) {
    return null;
  }
  if (type != 'object') return src; // eslint-disable-line
  if (Array.isArray(src)) return src.length ? src : null;
  for (k in src) {
    (v = withoutEmptyBase(src[k], depth)) === null || ((dst || (dst = {}))[k] = v);
  }
  return dst;
};
