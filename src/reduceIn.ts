/**
 * Reduces an object into a single value.
 * 
 * @param collection - The object to reduce.
 * @param iteratee - The function to call for each property.
 * @param accumulator - The initial accumulator value.
 * @param ctx - The `this` context to use for the function.
 * @returns The reduced value.
 * @example
 * const sum = reduceIn({ a: 1, b: 2, c: 3 }, (acc, value, key) => acc + value, 0); // => 6
 */
export const reduceIn = (
  collection: any,
  iteratee: (acc: any, value: any, key: string, collection: any) => any,
  accumulator: any,
  ctx?: any,
): any => {
  let k: string;
  for (k in collection) {
    accumulator = iteratee.call(
      ctx, accumulator, collection[k], k, collection,
    );
  }
  return accumulator;
};
