/**
 * Sorts an array in place using the provided compare function.
 *
 * This is a thin wrapper around `Array.prototype.sort` to keep
 * a consistent functional style.
 * 
 * @param src - The array to sort.
 * @param iteratee - The function to compare two elements.
 * @returns The sorted array (mutates `src`).
 * @example
 * sort([3, 1, 2]);                        // => [1, 2, 3]
 * sort([3, 1, 2], (a, b) => b - a);       // => [3, 2, 1]
 */
export const sort = <T>(src: T[], iteratee?: (a: T, b: T) => number): T[] => src.sort(iteratee);

