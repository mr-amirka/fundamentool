import {
  isRegExp, 
} from './is/isRegExp';
import {
  escapeRegExp, 
} from './escapeRegExp';
import {
  regexpParse, 
} from './regexpParse';

/**
 * Normalizes a separator to a regexp-safe source string.
 * If input is a RegExp, returns its source; otherwise escapes the string.
 * 
 * @param v - The string or regexp to normalize.
 * @returns The normalized string.
 * @example
 * regexpNormalizeText('a/b'); // => 'a\/b'
 * regexpNormalizeText(/a\/b/); // => 'a\/b'
 */
export function regexpNormalizeText(v: string | RegExp): string {
  return isRegExp(v)
    ? (regexpParse((v as RegExp).toString()) as RegExpExecArray)[1]
    : escapeRegExp(v as string);
}
