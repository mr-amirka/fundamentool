/**
 * Adds prefix to all keys in `suffixes` and writes into `output` map.
 * 
 * @param prefix - The prefix to add to the keys.
 * @param suffixes - The suffixes to join.
 * @param output - The output map to join the prefixes and suffixes into.
 * @returns The joined map.
 * @example
 * joinPrefixToMap('a.', { b: 1, c: 1 }); // => { 'a.b': 1, 'a.c': 1 }
 * joinPrefixToMap('x-', { y: 1 }, { z: 1 }); // => { z: 1, 'x-y': 1 }
 */
export const joinPrefixToMap = (
  prefix: string,
  suffixes: Record<string, any>,
  output?: Record<string, any>,
): Record<string, any> => {
  const dst: Record<string, any> = output || {};
  let suffix: string;
  for (suffix in suffixes) {
    dst[prefix + suffix] = 1;
  }
  return dst;
};

