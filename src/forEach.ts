const NATIVE_FOR_EACH = Array.prototype.forEach;

/**
 * Iterates over an array and calls a function for each item.
 * 
 * @param src - The array to iterate over.
 * @param fn - The function to call for each item.
 * @param ctx - The `this` context to use for the function.
 * @returns void
 * @example
 * forEach([1, 2, 3], (v, i) => console.log(i, v)); // 0 1 / 1 2 / 2 3
 */
export const forEach = <T>(
  src: T[],
  fn: (this: any, value: T, index: number, collection: T[]) => void,
  ctx?: any,
): void => {
  NATIVE_FOR_EACH.call(
src as any, fn, ctx,
  );
};

