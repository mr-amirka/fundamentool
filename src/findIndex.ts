/**
 * Finds index of first element in array‑like collection that satisfies predicate.
 * 
 * @param collection - The array to search in.
 * @param iteratee - The function to call for each item.
 * @param ctx - The `this` context to use for the function.
 * @returns The index of the first item that satisfies the predicate, or `-1` if no item is found.
 * @example
 * findIndex([10, 20, 30], v => v > 15); // => 1
 */
export const findIndex = <T = any>(
  collection: T[],
  iteratee: (value: T, index: number, collection: T[]) => boolean,
  ctx?: any,
): number => {
  const l = collection?.length || 0;
  let i = 0;
  for (; i < l; i++) {
    if (iteratee.call(
      ctx, collection[i], i, collection,
    )) {
      return i;
    }
  }
  return -1;
};

