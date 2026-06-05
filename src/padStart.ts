const NATIVE_PAD_START = ''.padStart;

/**
 * Polyfill-friendly padStart implementation for strings.
 * 
 * @param value - The string to pad.
 * @param length - The length to pad the string to.
 * @param space - The string to use for padding.
 * @returns The padded string.
 * @example
 * padStart('hello', 10, '0'); // => '00000hello'
 */
export function padStart(
  value: string,
  ...args: Parameters<typeof NATIVE_PAD_START>
): string {
  return NATIVE_PAD_START.call(value, ...args);
}

