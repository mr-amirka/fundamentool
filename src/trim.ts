const REGEXP_TRIM_SPACE = /^\s+|\s+$/g;

/**
 * Trims whitespace from both ends of a string.
 * 
 * @param v - The string to trim.
 * @returns The trimmed string.
 * @example
 * trim('  hello  ') // => 'hello'
 */
export const trim = (v: string): string => v.replace(REGEXP_TRIM_SPACE, '');

