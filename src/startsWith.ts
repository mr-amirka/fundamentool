import { NATIVE_SLICE } from './slice';

const NATIVE_STARTS_WITH = ''.startsWith;

/**
 * Functional wrapper around String.prototype.startsWith with a fallback.
 * 
 * @param self - The string to check.
 * @param searchString - The string to search for.
 * @param position - The position to start searching from.
 * @returns Whether the string starts with the search string.
 * @example
 * startsWith('hello', 'he') // => true
 * startsWith('hello', 'hello') // => true
 * startsWith('hello', 'el', 1) // => true
 */
export function startsWith(
  self: string,
  searchString: string,
  position?: number,
): boolean {
  return NATIVE_STARTS_WITH.apply(self, NATIVE_SLICE.call(arguments, 1));
}

