import {
  providerOfIsClass, 
} from '../providerOfIsClass';

/**
 * Checks whether value is a Blob (when Blob is available).
 *
 * @param v - The value to check.
 * @returns `true` if value is a Blob instance.
 * @example
 * isBlob(new Blob(['data'])); // => true
 * isBlob('data');             // => false
 */
export const isBlob = providerOfIsClass(() => Blob);
