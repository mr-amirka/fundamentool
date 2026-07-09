/**
 * Removes all occurrences of value from the collection (in place).
 * Returns the number of elements removed.
 * 
 * @param collection - The collection to remove elements from.
 * @param v - The value to remove from the collection.
 * @returns The number of elements removed.
 * @example
 * removeOf([1, 2, 3, 4, 5], 3); // => 1
 */
export function removeOf<T>(collection: T[], v: T): number {
  const length = collection?.length || 0;
  const splice = [].splice;
  let i = length;
  while (i--) {
    if (v === collection[i]) {
      splice.call(
        collection, i, 1,
      );
    }
  }
  return length - collection.length;
}
