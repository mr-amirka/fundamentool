const REGEXP_TRIM_QUOTE = /^['"`]+|['"`]+$/g;

/**
 * Trims whitespace from both ends of a string.
 * 
 * @param v - The string to trim.
 * @returns The trimmed string.
 * @example
 * trimQuote('"hello"') // => 'hello'
 * trimQuote('`hello`') // => 'hello'
 * trimQuote('\'hello\'') // => 'hello'
 */
export const trimQuote = (v: string): string => v.replace(REGEXP_TRIM_QUOTE, '');