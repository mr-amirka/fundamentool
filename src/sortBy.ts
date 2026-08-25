import {
  sort, 
} from './sort';

/**
 * Sorts an array by the result of a function.
 *
 * @param src - The array to sort.
 * @param iteratee - The function to get the value to sort by.
 * @returns The sorted array.
 * @example
 * sortBy([{ name: 'John', age: 20 }, { name: 'Jane', age: 21 }], (u) => u.name.toLowerCase()); // => [{ name: 'Jane', age: 21 }, { name: 'John', age: 20 }]
 */
export const sortBy = <T>(
  src: T[],
  iteratee: (item: T) => any,
): T[] => sort(src, (a: T, b: T) => {
  const av = iteratee(a);
  const bv = iteratee(b);
  return av < bv ? -1 : av > bv ? 1 : 0;
});

