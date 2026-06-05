/**
 * Joins keys from `prefixes` and `suffixes` into a flags map.
 * 
 * @param prefixes - The prefixes to join.
 * @param suffixes - The suffixes to join.
 * @param separator - The separator to join the prefixes and suffixes with.
 * @param output - The output map to join the prefixes and suffixes into.
 * @returns The joined map.
 * @example
 * joinMaps({ a: true, b: false }, { c: true, d: false }) // => { 'a.c': 1, 'a.d': 1, 'b.c': 1, 'b.d': 1 }
 * joinMaps({ a: true, b: false }, { c: true, d: false }, '.') // => { 'a.c': 1, 'a.d': 1, 'b.c': 1, 'b.d': 1 }
 * joinMaps({ a: true, b: false }, { c: true, d: false }, '.', { e: true, f: false }) // => { 'a.c.e': 1, 'a.c.f': 1, 'a.d.e': 1, 'a.d.f': 1, 'b.c.e': 1, 'b.c.f': 1, 'b.d.e': 1, 'b.d.f': 1 }
 */
export const joinMaps = (
  prefixes: Record<string, any>,
  suffixes: Record<string, any>,
  separator: string = '',
  output?: Record<string, any>,
): Record<string, any> => {
  const dst: Record<string, any> = output || {};
  let prefix: string;
  let suffix: string;
  let p: string;

  for (prefix in prefixes) {
    p = prefix + separator;
    for (suffix in suffixes) {
      dst[p + suffix] = 1;
    }
  }
  return dst;
};

