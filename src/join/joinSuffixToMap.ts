/**
 * Builds a map of keys composed from each prefix plus the given suffix.
 *
 * For every key in `prefixes`, the result will contain
 * `prefix + suffix` with value `1`.
 * 
 * @param prefixes - The prefixes to join.
 * @param suffix - The suffix to join.
 * @param output - The output map to join the prefixes and suffixes into.
 * @returns The joined map.
 * @example
 * joinSuffixToMap({ a: true, b: true }, '-x') // => { 'a-x': 1, 'b-x': 1 }
 * joinSuffixToMap({ a: true, b: true }, '-x', { c: 1, d: 0 }) // => { 'c': 1, 'd': 0, 'a-x': 1, 'b-x': 1 }
 */
export const joinSuffixToMap = (
  prefixes: Record<string, unknown>,
  suffix: string,
  output?: Record<string, number>,
): Record<string, number> => {
  const result: Record<string, number> = output || {};
  let prefix: string;
  for (prefix in prefixes) {
    result[prefix + suffix] = 1;
  }
  return result;
};

