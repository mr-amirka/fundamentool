/**
 * Checks whether value is an ArrayBuffer.
 *
 * @param v - The value to check.
 * @returns `true` if value is an ArrayBuffer.
 * @example
 * isArrayBuffer(new ArrayBuffer(8)); // => true
 * isArrayBuffer([]);                 // => false
 */
export const isArrayBuffer = (v: any) => v instanceof ArrayBuffer;
