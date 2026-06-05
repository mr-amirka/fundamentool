/**
 * Returns a new object containing only the fields of `src`
 * for which `map` has a truthy value.
 * 
 * @param src - The source object.
 * @param map - The map object.
 * @param dst - The destination object to write into.
 * @returns The picked object.
 * @example
 * pickByMap({ a: 1, b: 2, c: 3 }, { a: true, c: true }); // => { a: 1, c: 3 }
 * pickByMap({ a: 1, b: 2, c: 3 }, { a: true, c: true }, { b: 2 }); // => { a: 1, c: 3 } // => { a: 1, c: 3 }
 */
export function pickByMap<T extends Record<string, any>, M extends Record<string, any>>(
  src: T,
  map: M,
  dst?: Partial<T>,
): Partial<T> {
  const result: Partial<T> = dst || {};
  let k: keyof T & keyof M;
  let v: any;

  // eslint-disable-next-line guard-for-in
  for (k in map as any) {
    if ((map as any)[k]) {
      v = src[k];
      v === undefined || ((result as any)[k] = v);
    }
  }

  return result;
}

