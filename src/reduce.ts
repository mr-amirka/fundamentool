const originalReduce = [].reduce;

/**
 * Reduces an array-like collection into a single value.
 * 
 * @param collection - The collection to reduce.
 * @param iteratee - The function to call for each item.
 * @param accumulator - The initial accumulator value.
 * @returns The reduced value.
 * @example
 * const sum = reduce([1, 2, 3], (acc, value) => acc + value, 0); // => 6
 */
export const reduce = (
  collection: any,
  iteratee: (acc: any, value: any, index: number, collection: any) => any,
  accumulator: any,
): any => originalReduce.call(
  collection, iteratee, accumulator,
);
