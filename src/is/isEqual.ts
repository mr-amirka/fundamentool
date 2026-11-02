/**
 * Deep equality check up to `depth` levels of nesting.
 * At depth `0` (default), nested objects are compared by reference only. `NaN` equals `NaN`; `Date`s compare by time and
 * `RegExp`s by source and flags, at any depth — they are values, not containers.
 *
 * @param src1 - First value.
 * @param src2 - Second value.
 * @param depth - Nesting depth limit (default: 0).
 * @returns `true` if both values are deeply equal within the given depth.
 * @example
 * isEqual(1, 1);                    // => true
 * isEqual({ a: 1 }, { a: 1 });      // => true
 * isEqual({ a: {} }, { a: {} });    // => false (depth 0, nested ref differs)
 * isEqual({ a: {} }, { a: {} }, 1); // => true  (depth 1, recurses into keys)
 * isEqual(new Date(1), new Date(2)); // => false
 */
export const isEqual = (
  src1: any, src2: any, depth?: number,
) => {
  return !isNotEqual(
    src1, src2, depth || 0,
  );
};

function isNotEqual(
  src1: any, src2: any, depth: number,
) {
  if (src1 === src2 || src1 !== src1 && src2 !== src2) {
    return;
  }
  if (src1 instanceof Date || src2 instanceof Date) {
    return src1 instanceof Date && src2 instanceof Date && src1.getTime() === src2.getTime() ? undefined : 1;
  }
  if (src1 instanceof RegExp || src2 instanceof RegExp) {
    return src1 instanceof RegExp && src2 instanceof RegExp && String(src1) === String(src2) ? undefined : 1;
  }
  if (depth < 0) {
    return 1;
  }
  const t1 = typeof src1,
    t2 = typeof src2;
  if (t1 !== t2 || t1 !== 'object' || !src1 || !src2) {
    return 1;
  }
  depth--;
  let k: string;
  const cache: any = {};
  for (k in src1) {
    if (isNotEqual(
      src1[k], src2[k], depth,
    )) {
      return 1;
    }
    cache[k] = 1;
  }
  for (k in src2) {
    if (!cache[k] && isNotEqual(
      src1[k], src2[k], depth,
    )) {
      return 1;
    }
  }
}
