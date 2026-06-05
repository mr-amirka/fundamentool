/**
 * Maps over object properties into an output object.
 * 
 * @param collection - The object to map.
 * @param iteratee - The function to call for each property.
 * @param output - The object to map into.
 * @param ctx - The `this` context to use for the function.
 * @returns The mapped object.
 * @example
 * mapIn({ a: 1, b: 2 }, v => v * 10); // => { a: 10, b: 20 }
 */
export const mapIn = <T = any, R = any>(
  collection: Record<string, T>,
  iteratee: (value: T, key: string, collection: Record<string, T>) => R,
  output?: Record<string, R>,
  ctx?: any,
): Record<string, R> => {
  const result: Record<string, R> = output || {};
  let k: string;
  for (k in collection) {
    result[k] = iteratee.call(ctx, collection[k], k, collection);
  }
  return result;
};

