/**
 * Finds first key in object that satisfies predicate.
 * 
 * @param collection - The object to search in.
 * @param iteratee - The function to call for each property.
 * @param ctx - The `this` context to use for the function.
 * @returns The first key that satisfies the predicate, or `undefined` if no key is found.
 * @example
 * findKey({ x: 1, y: 2 }, v => v > 1); // => 'y'
 */
export const findKey = <T = any>(
  collection: Record<string, T>,
  iteratee: (value: T, key: string, collection: Record<string, T>) => any,
  ctx?: any,
): string | undefined => {
  let k = '';
  for (k in collection) {
    if (iteratee.call(
      ctx, collection[k], k, collection,
    )) {
      return k;
    }
  }
};

