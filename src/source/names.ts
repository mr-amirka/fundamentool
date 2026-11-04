import {
  escapeRegExp,
} from '../escapeRegExp';

const ASTERISK = '*';

/** The start of a name before a pattern's ending: `fill` in `fillClassName`, `data-` in `data-class`. */
const NAME_HEAD_SOURCE = '[\\w$-]+';

/**
 * A character that continues an identifier: a letter, a digit, `_`, `$`. Past the end (`source[l]`, `undefined`) — no:
 * every comparison with `undefined` is false.
 *
 * @param ch - one character
 */
export function isIdentChar(ch: string): boolean {
  return ch === '_' || ch === '$'
    || (ch >= 'a' && ch <= 'z')
    || (ch >= 'A' && ch <= 'Z')
    || (ch >= '0' && ch <= '9');
}

/**
 * A space, a tab or a line break.
 *
 * @param ch - one character
 */
export function isSpaceChar(ch: string): boolean {
  return ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r';
}

/**
 * Whether a name matches one of the names or `*Ending` patterns: the same name, or a name that ends with the pattern's
 * ending and has at least one character before it. Case as written. It runs on every node of a file, so the ending is
 * compared character by character, with no `slice`.
 *
 * @param name - a name in the source
 * @param patterns - exact names and `*Ending` patterns
 * @returns `true` when the name matches
 *
 * @example
 * matchesName('fillClassName', ['className', '*ClassName']);   // => true
 * matchesName('classname', ['*ClassName']);                    // => false
 * matchesName('ClassName', ['*ClassName']);                    // => false — the ending alone, nothing before it
 */
export function matchesName(name: string, patterns: readonly string[]): boolean {
  const l = patterns.length;
  const nameLength = name.length;
  let i = 0;
  let pattern: string;
  let at: number;
  let j: number;
  let length: number;
  for (; i < l; i++) {
    pattern = patterns[i];
    if (pattern[0] !== ASTERISK) {
      if (pattern === name) {
        return true;
      }
      continue;
    }
    length = pattern.length;
    // The ending (`ClassName`) starts in the name at `at`; at least one character before it.
    at = nameLength - length + 1;
    if (at < 1) {
      continue;
    }
    j = 1;
    while (j < length && name[at + j - 1] === pattern[j]) {
      j++;
    }
    if (j === length) {
      return true;
    }
  }
  return false;
}

/**
 * A name or a `*Ending` pattern as a regular expression's source, for a caller's own search: an exact name escaped, a
 * pattern as any name with that ending. The left boundary is the caller's.
 *
 * @param pattern - an exact name or a `*Ending` pattern
 * @returns the source of a regular expression
 *
 * @example
 * namePatternSource('className');    // => 'className'
 * namePatternSource('*ClassName');   // => '[\\w$-]+ClassName'
 */
export function namePatternSource(pattern: string): string {
  return pattern[0] === ASTERISK ? NAME_HEAD_SOURCE + escapeRegExp(pattern.slice(1)) : escapeRegExp(pattern);
}
