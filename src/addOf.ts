import {
  indexOf, 
} from './indexOf';

/**
 * Adds an item to a collection if it is not already present.
 * 
 * @param collection - The array to add the item to.
 * @param item - The item to add to the collection.
 * @returns The collection with the item added.
 * @example
 * addOf([1, 2, 3], 2); // => [1, 2, 3] (already present)
 * addOf([1, 2], 3);    // => [1, 2, 3]
 */
export const addOf = <T>(collection: T[], item: T): T[] => {
  if (indexOf(collection, item) < 0) {
    collection.push(item);
  }
  return collection;
};
