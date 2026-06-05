/**
 * Checks that predicate returns truthy for all own and inherited properties.
 *
 * @param collection - The object to check.
 * @param identity - Predicate called with `(value, key, collection)`.
 * @param ctx - Optional `this` context for the predicate.
 * @returns `true` if all properties satisfy the predicate, `false` otherwise.
 * @example
 * everyIn({ a: 2, b: 4 }, v => v % 2 === 0); // => true
 */
export const everyIn = <T extends Record<string, any>>(
  collection: T,
  identity: (value: T[keyof T], key: keyof T & string, collection: T) => any,
  ctx?: any,
): boolean => {
  let k: string;
  for (k in collection) {
    if (!identity.call(ctx, collection[k], k, collection)) return false;
  }
  return true;
};

