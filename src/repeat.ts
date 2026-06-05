const nativeRepeat = ''.repeat;

/**
 * Repeats a string count times.
 * 
 * @param str - The string to repeat.
 * @param count - The number of times to repeat the string.
 * @returns The repeated string.
 * @example
 * repeat('a', 3); // => 'aaa'
 */
export const repeat = (str: string, count: number): string =>
  nativeRepeat.call(str, count);
