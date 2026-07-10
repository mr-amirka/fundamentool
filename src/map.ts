/**
 * Maps array‑like collection to an array.
 * 
 * @param collection - The collection to map.
 * @param iteratee - The function to call for each item, or a property name to pluck.
 * @param output - The array to map into.
 * @param ctx - The `this` context to use for the function.
 * @returns The mapped array.
 * @example
 * map([1, 2, 3], x => x * 2); // => [2, 4, 6]
 * map([{a:1},{a:2}], 'a'); // => [1, 2]
 */
export function map<T, K extends keyof T>(collection: T[], iteratee: K, output?: T[K][], ctx?: any): T[K][];
export function map<T, R>(collection: T[], iteratee: (value: T, index: number, collection: T[]) => R, output?: R[], ctx?: any): R[];
export function map(
  collection: any, iteratee: any, output?: any, ctx?: any,
): any {
  const length = collection?.length || 0;
  const result: any[] = output || new Array(length);
  let i = 0;
  if (typeof iteratee === 'string') {
    for (; i < length; i++) {
      result[i] = collection[i][iteratee];
    }
  } else {
    for (; i < length; i++) {
      result[i] = iteratee.call(
        ctx, collection[i], i, collection,
      );
    }
  }
  return result;
}

