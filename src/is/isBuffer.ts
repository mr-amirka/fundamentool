import { providerOfIsClass } from '../providerOfIsClass';

/**
 * Checks whether value is a Buffer (in Node.js environments).
 *
 * @param v - The value to check.
 * @returns `true` if value is a Buffer instance.
 * @example
 * isBuffer(Buffer.from('data')); // => true
 * isBuffer('data');              // => false
 */
export const isBuffer = providerOfIsClass(() => Buffer);
