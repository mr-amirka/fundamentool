/**
 * Extends an object with the properties of another object.
 * 
 * @param dst - The destination object.
 * @param src - The source object.
 * @returns The destination object.
 * @example
 * extend({ a: 1 }, { b: 2, c: 3 }); // => { a: 1, b: 2, c: 3 }
 */
export const extend = <
  S extends Record<string, any>,
  D extends Record<string, any>,
>(dst: D, src?: S | undefined | null): D & S => {
  if (src) {
    let k: string;
    for (k in src) {
      (dst as any)[k] = src[k];
    }
  }
  return dst as D & S;
};