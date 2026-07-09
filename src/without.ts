import {
  indexOf, 
} from './indexOf';

/**
 * Creates a shallow copy of `src` without the specified keys.
 *
 * @param src - Source object.
 * @param withoutKeys - Array of keys that should be excluded.
 * @param dst - Optional destination object to write into.
 * @returns Object that contains all properties of `src` whose keys are not in `withoutKeys`.
 * @example
 * without({ a: 1, b: 2, c: 3 }, ['b']); // => { a: 1, c: 3 }
 */
export const without = (
  src: Record<string, any>,
  withoutKeys: any[],
  dst?: Record<string, any>,
): Record<string, any> => {
  const result: Record<string, any> = dst || {};
  // eslint-disable-next-line guard-for-in
  for (const key in src) {
    if (indexOf(withoutKeys as any, key) < 0) {
      result[key] = (src as any)[key];
    }
  }
  return result;
};

