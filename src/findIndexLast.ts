/**
 * Finds index of last element in array‑like collection that satisfies predicate.
 * 
 * @param collection - The array to search in.
 * @param iteratee - The function to call for each item.
 * @param ctx - The `this` context to use for the function.
 * @returns The index of the last item that satisfies the predicate, or `-1` if no item is found.
 * @example
 * findIndexLast([1, 2, 3, 2], v => v === 2); // => 3
 */
export const findIndexLast = <T = any>(
  collection: T[],
  iteratee: (value: T, index: number, collection: T[]) => boolean,
  ctx?: any,
): number => {
  const length = collection?.length || 0;
  let i = length - 1;
  for (; i >= 0; i--) {
    if (iteratee.call(ctx, collection[i], i, collection)) return i;
  }
  return -1;
};

