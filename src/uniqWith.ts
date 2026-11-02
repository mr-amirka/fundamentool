import {
  isEqual,
} from './is/isEqual';

/**
 * The default comparator: equal to ten levels deep — as far as `isMatch` went when it was the default (fundamentool
 * D-086); a cap, since the items may hold cycles.
 */
const EQUAL_DEEP = (a: unknown, b: unknown): boolean => isEqual(
  a, b, 10,
);

/**
 * Returns unique items from input using a custom comparator.
 * Default comparator: deep equality (`isEqual` to ten levels), so the result doesn't depend on the order.
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
  const cmp = comparator || EQUAL_DEEP;
  const includes: T[] = [];
  let includesLength = 0;
  const length = input?.length || 0;
  let value: T;
  let hasUniq: boolean;
  let ii: number;
  let i = 0;

  for (; i < length; i++) {
    value = input[i];
    hasUniq = true;
    for (ii = 0; ii < includesLength; ii++) {
      if (cmp(includes[ii], value)) {
        hasUniq = false;
        break;
      }
    }
    if (hasUniq) {
      includesLength = includes.push(value);
      result.push(value);
    }
  }

  return result;
}
