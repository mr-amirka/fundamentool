const REGEXP = /(["\\])/g;

/**
 * Escapes double quotes and backslashes.
 * 
 * @param v - The string to escape.
 * @returns The escaped string.
 * @example
 * escapeQuote('say "hi"'); // => 'say \\"hi\\"'
 */
export const escapeQuote = (v: string): string => v.replace(REGEXP, '\\$1');

