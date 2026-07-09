export const REGEXP_ASCII = /[^A-Za-z0-9_:;\\\-+=|/*.,?&^%$#@!~`"'(){}[\]<> ]/;

/**
 * Checks whether a string contains only ASCII-printable characters.
 *
 * @param v - The value to check.
 * @returns `true` if the string is non-empty and contains only ASCII characters.
 * @example
 * isASCII('hello');  // => true
 * isASCII('привет'); // => false
 * isASCII('');       // => false
 */
export const isASCII = (v: string | null | undefined): boolean => !!v && !REGEXP_ASCII.test(v);
