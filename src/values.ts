/**
 * Returns enumerable values of an object.
 *
 * Uses native `Object.values` when available, otherwise falls back
 * to a simple `for..in` iteration.
 *
 * @param obj - The object to extract values from.
 * @returns Array of enumerable values.
 * @example
 * values({ a: 1, b: 2 }); // => [1, 2]
 */
export const values = (obj: any): any[] => {
  if (obj == null) {
    return [];
  }

  const nativeValues = (Object as any).values as
    | ((o: any) => any[])
    | undefined;

  if (typeof nativeValues === 'function') {
    return nativeValues(obj);
  }

  const output: any[] = [];
  // eslint-disable-next-line guard-for-in
  for (const prop in obj) {
    output.push((obj as any)[prop]);
  }
  return output;
};

