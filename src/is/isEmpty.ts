/**
 * Checks whether an object has no enumerable properties.
 *
 * @param src - The object to check.
 * @returns `true` if the object has no enumerable properties.
 * @example
 * isEmpty({});        // => true
 * isEmpty({ a: 1 });  // => false
 */
export const isEmpty = (src: Record<string, any>, k?: string): boolean => {
  // eslint-disable-next-line guard-for-in
  for (k in src) return false;
  return true;
};

