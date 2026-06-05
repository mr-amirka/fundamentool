/**
 * Simple synchronous loop utility that calls `fn` for indices [start, length).
 * 
 * @param length - The length of the loop.
 * @param fn - The function to call for each index.
 * @param start - The start index.
 * @returns void
 * @example
 * loop(10, (index) => console.log(index)); // => 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
 */
export const loop = (
  length: number,
  fn: (index: number) => void,
  start: number = 0,
): void => {
  let i = start || 0;
  for (; i < length; i++) {
    fn(i);
  }
};

