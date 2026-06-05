import { hasOwn } from './hasOwn';

/**
 * Iterates over own enumerable properties of `obj`
 * and calls `iteratee(value, key, obj)` for each.
 * 
 * @param obj - The object to iterate over.
 * @param iteratee - The function to call for each property.
 * @param ctx - The `this` context to use for the function.
 * @returns void
 * @example
 * forInOwn({ a: 1, b: 2 }, (v, k) => console.log(k, v)); // a 1 / b 2
 */
export const forInOwn = <T extends Record<string, any>>(
  obj: T,
  iteratee: (this: any, value: T[keyof T], key: keyof T & string, obj: T) => void,
  ctx?: any,
): void => {
  let k: string;
  for (k in obj) {
    if (hasOwn(obj, k)) {
      iteratee.call(ctx, obj[k], k as keyof T & string, obj);
    }
  }
};

