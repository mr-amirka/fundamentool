/**
 * Filters object properties into a new object.
 * 
 * @param collection - The object to filter.
 * @param iteratee - The function to call for each property.
 * @param output - The object to filter into.
 * @param ctx - The `this` context to use for the function.
 * @returns The filtered object.
 * @example
 * filterIn({ a: 1, b: 0, c: 2 }, v => v > 0); // => { a: 1, c: 2 }
 */
export const filterIn = <T>(
  collection: Record<string, T>,
  iteratee: (value: T, key: string, collection: T[]) => any,
  output?: Record<string, T>,
  ctx?: any,
): Record<string, T> => {
  let v: T;
  const result: Record<string, T> = output || {};
  for (const k in collection) {
    v = collection[k];
    if (iteratee.call(ctx, v, k, collection)) {
      result[k] = v;
    }
  }
  return result;
};

