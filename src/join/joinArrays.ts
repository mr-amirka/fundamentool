/**
 * Joins two arrays into a new array using the given separator string.
 *
 * If `suffixes` is empty, returns a shallow copy of `prefixes`.
 * 
 * @param prefixes - The prefixes to join.
 * @param suffixes - The suffixes to join.
 * @param separator - The separator to join the prefixes and suffixes with.
 * @param output - The output array to join the prefixes and suffixes into.
 * @returns The joined array.
 * @example
 * joinArrays(['a', 'b'], ['d', 'e']) // => ['a.d', 'a.e', 'b.d', 'b.e']
 * joinArrays(['a', 'b'], ['d', 'e'], '.') // => ['a.d', 'a.e', 'b.d', 'b.e']
 * joinArrays(['a', 'b'], ['d', 'e', 'f'], ':') // => ['a:d', 'a:e', 'a:f', 'b:d', 'b:e', 'b:f']
 * joinArrays(['a', 'b'], ['d', 'e'], '.', ['g', 'h', 'i']) // => ['g', 'h', 'i', 'a.d', 'a.e', 'b.d', 'b.e']
 */
export const joinArrays = (
  prefixes: string[],
  suffixes: string[],
  separator: string = '',
  output?: string[],
): string[] => {
  const result = output || [];
  const pl = prefixes.length;
  const sl = suffixes.length;
  let prefix: string;
  let pi = 0;
  let si = 0;

  for (; pi < pl; pi++) {
    prefix = prefixes[pi] + separator;
    for (si = 0; si < sl; si++) {
      result.push(prefix + suffixes[si] as string);
    }
  }

  return result;
};
