/**
 * Checks whether `src` matches the structure of `matchs` up to `depth` levels (default: 10).
 * Unlike `isEqual`, only the keys present in `matchs` are compared.
 *
 * @param src - The value to test.
 * @param matchs - The pattern to match against.
 * @param depth - Maximum recursion depth (default: 10).
 * @returns `true` if all keys in `matchs` are present in `src` with equal values.
 * @example
 * isMatch({ a: 1, b: 2 }, { a: 1 }); // => true
 * isMatch({ a: 1 }, { a: 2 });        // => false
 * isMatch({ a: 1 }, { b: 1 });        // => false
 */
export const isMatch = (
  src: any, matchs: any, depth?: number,
) => {
  return !isNotMatch(
    src, matchs, depth || 10,
  );
};

function isNotMatch(
  src: any, matchs: any, depth: number,
) {
  if (src === matchs || depth < 0) {
    return;
  }
  let k: string;
  const t1 = typeof src;
  const t2 = typeof matchs;
  if (t1 !== t2 || t1 !== 'object' || !src) {
    return true;
  }
  depth--;
  for (k in matchs) {
    if (isNotMatch(
      src[k], matchs[k], depth,
    )) {
      return true;
    }
  }
}
