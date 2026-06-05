/**
 * Iterates over all enumerable properties (own + inherited) of an object.
 * 
 * @param obj - The object to iterate over.
 * @param iteratee - The function to call for each property.
 * @param ctx - The `this` context to use for the function.
 * @returns void
 * @example
 * forIn({ a: 1, b: 2 }, (v, k) => console.log(k, v)); // a 1 / b 2
 */
export const forIn = <T extends Record<string, any>>(
  obj: T,
  iteratee: (this: any, value: T[keyof T], key: keyof T & string, obj: T) => void,
  ctx?: any,
): void => {
  let k: string;
  for (k in obj as any) {
    iteratee.call(ctx, obj[k], k as keyof T & string, obj);
  } 
};

