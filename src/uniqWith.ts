import {
  isMatch, 
} from './is/isMatch';

/**
 * Returns unique items from input using a custom comparator.
 * Default comparator is isMatch (deep equality).
 * 
 * @param input - The input array to filter.
 * @param comparator - The comparator function to use.
 * @param output - The output array to write to.
 * @returns Array of unique items.
 * @example
 * uniqWith([1, 2, 1, 3]);                         // => [1, 2, 3]
 * uniqWith([{a:1},{a:1},{a:2}], (x, y) => x.a === y.a); // => [{a:1},{a:2}]
 */
export function uniqWith<T>(
  input: T[] | null | undefined,
  comparator?: (a: T, b: T) => boolean,
  output?: T[],
): T[] {
  const result = output || [];
  const cmp = comparator || isMatch;
  const includes: T[] = [];
  const length = input?.length || 0;
  let value: T;
  let hasUniq: boolean;
  let ii: number;
  let i = 0;

  for (; i < length; i++) {
    value = input[i];
    hasUniq = true;
    for (ii = 0; ii < includes.length; ii++) {
      if (cmp(includes[ii], value)) {
        hasUniq = false;
        break;
      }
    }
    if (hasUniq) {
      includes.push(value);
      result.push(value);
    }
  }

  return result;
}
