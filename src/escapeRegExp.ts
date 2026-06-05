const REGEXP_CHAR = /[\\^$.*+?()[\]{}|]/gim;

/**
 * Escapes characters with special meaning in regular expressions.
 * 
 * @param v - The string to escape.
 * @returns The escaped string.
 * @example
 * escapeRegExp('price: $1.00'); // => 'price: \\$1\\.00'
 */
export const escapeRegExp = (v: string): string => v.replace(REGEXP_CHAR, '\\$&');
