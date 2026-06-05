const NATIVE_EVERY = [].every;

/**
 * Checks that predicate returns truthy for all items in an array‑like collection.
 * 
 * @param collection - The collection to check.
 * @param identity - The identity to check.
 * @returns `true` if all elements satisfy the predicate, `false` otherwise.
 * @example
 * every([2, 4, 6], v => v % 2 === 0); // => true
 */
export const every = <T>(
  collection: ArrayLike<T>,
  identity: (value: T, index: number, collection: ArrayLike<T>) => any,
): boolean => NATIVE_EVERY.call(collection, identity);

