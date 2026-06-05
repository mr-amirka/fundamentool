/**
 * Maps array‑like collection to an array.
 * 
 * @param collection - The collection to map.
 * @param iteratee - The function to call for each item.
 * @param output - The array to map into.
 * @param ctx - The `this` context to use for the function.
 * @returns The mapped array.
 * @example
 * map([1, 2, 3], x => x * 2); // => [2, 4, 6]
 */
export const map = <T = any, R = any>(
  collection: T[],
  iteratee: (value: T, index: number, collection: T[]) => R,
  output?: R[],
  ctx?: any,
): R[] => {
  const length = collection?.length || 0;
  const result: R[] = output || new Array(length);
  let i = 0;
  for (; i < length; i++) {
    result[i] = iteratee.call(ctx, collection[i], i, collection);
  }
  return result;
};

