/**
 * Filters array‑like collection into an array.
 * 
 * @param collection - The array to filter.
 * @param iteratee - The function to call for each item.
 * @param output - The array to filter into.
 * @param ctx - The `this` context to use for the function.
 * @returns The filtered array.
 * @example
 * filter([1, 2, 3, 4], x => x % 2 === 0); // => [2, 4]
 */
export const filter = <T>(
  collection: T[],
  iteratee: (value: T, index: number, collection: T[]) => boolean,
  output?: T[],
  ctx?: any,
): T[] => {
  const length = collection?.length || 0;
  const result: T[] = output || [];
  let i = 0;
  let v: T;
  for (; i < length; i++) {
    v = collection[i];
    if (iteratee.call(
      ctx, v, i, collection,
    )) {
      result.push(v);
    }
  }
  return result;
};

