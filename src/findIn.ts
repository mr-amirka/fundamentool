/**
 * Finds first value in object that satisfies predicate.
 * 
 * @param collection - The object to search in.
 * @param iteratee - The function to call for each property.
 * @param ctx - The `this` context to use for the function.
 * @returns The first value that satisfies the predicate, or `undefined` if no value is found.
 * @example
 * findIn({ a: 1, b: 2 }, v => v > 1); // => 2
 */
export const findIn = <T = any>(
  collection: Record<string, T>,
  iteratee: (value: T, key: string, collection: Record<string, T>) => boolean,
  ctx?: any,
): T | undefined => {
  let v: T;
  for (const k in collection) {
    if (iteratee.call(ctx, (v = collection[k]), k, collection)) return v;
  }
};

