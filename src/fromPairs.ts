/**
 * Converts array of [key, value] pairs into an object.
 * 
 * @param entries - The array of [key, value] pairs to convert.
 * @param dst - The destination object to convert into.
 * @returns The converted object.
 * @example
 * fromPairs([['a', 1], ['b', 2]]); // => { a: 1, b: 2 }
 */
export const fromPairs = (
  entries: Array<[string, any]> | null | undefined,
  dst?: Record<string, any>,
): Record<string, any> => {
  const out: Record<string, any> = dst || {};
  const length = (entries && entries.length) || 0;
  let i = 0;
  let line: [string, any];
  for (; i < length; i++) {
    line = entries![i];
    out[line[0]] = line[1];
  }
  return out;
};