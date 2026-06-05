/**
 * Finds first item in array‑like collection that satisfies predicate.
 * 
 * @param collection - The array to search in.
 * @param iteratee - The function to call for each item.
 * @param ctx - The `this` context to use for the function.
 * @returns The first item that satisfies the predicate, or `undefined` if no item is found.
 * @example
 * find([1, 2, 3], x => x > 1); // => 2
 */
export const find = <T = any>(
  collection: T[],
  iteratee: (value: T, index: number, collection: T[]) => boolean,
  ctx?: any,
): T | undefined => {
  let v: T;
  let i = 0;
  const l = collection?.length || 0;
  for (; i < l; i++) {
    if (iteratee.call(ctx, (v = collection[i]), i, collection)) return v;
  }
};

