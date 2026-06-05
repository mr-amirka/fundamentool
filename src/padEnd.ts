const NATIVE_PAD_END = ''.padEnd;
const DEFAULT_SPACE = ' ';

/**
 * Polyfill-friendly padEnd implementation for strings.
 * 
 * @param v - The string to pad.
 * @param length - The length to pad the string to.
 * @param space - The string to use for padding.
 * @returns The padded string.
 * @example
 * padEnd('hello', 10, '0'); // => 'hello00000'
 */
export function padEnd(v: string, length: number, space?: string): string {
  return (NATIVE_PAD_END as any).call('' + v, length, space || DEFAULT_SPACE);
}

