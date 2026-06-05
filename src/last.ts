/**
 * Returns the last element of an array‑like value.
 * 
 * @param input - The array‑like value to get the last element of.
 * @returns The last element of the array‑like value.
 * @example
 * last([1, 2, 3]) // => 3
 */
export const last = <T>(input: ArrayLike<T>): T | undefined => {
  const length = input?.length || 0;
  return length ? (input as any)[length - 1] : undefined;
};

