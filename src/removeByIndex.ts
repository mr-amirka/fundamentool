import { isDefined } from './is/isDefined';

/**
 * Returns a new array with elements at [index, index+length) removed.
 * 
 * @param collection - The collection to remove elements from.
 * @param index - The index of the first element to remove.
 * @param length - The number of elements to remove.
 * @returns A new array with elements at [index, index+length) removed.
 * @example
 * removeByIndex([1, 2, 3, 4, 5], 2, 2); // => [1, 2, 5]
 */
export function removeByIndex<T>(
  collection: T[],
  index: number,
  length?: number,
): T[] {
  const inputLength = (collection && collection.length) || 0;
  const offset = Math.min(inputLength, Math.max(0, index));
  const len = isDefined(length) ? length : 1;
  const output = new Array(
    Math.min(inputLength, offset) + Math.max(0, inputLength - offset - len),
  );
  let out = 0;
  let i = 0;
  for (; i < offset; i++) {
    output[out++] = collection[i];
  }
  for (i = offset + len; i < inputLength; i++) {
    output[out++] = collection[i];
  }
  return output;
}
