import { values } from './values';

/**
 * Returns the number of enumerable values in a collection.
 * 
 * @param v - The collection to get the size of.
 * @returns The size of the collection.
 * @example
 * size({ a: 1, b: 2 }); // => 2
 * size([]); // => 0
 */
export const size = (v: unknown): number =>
  values(v).length;
