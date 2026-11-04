import type {
  TCommentVisit,
} from './types';

const NEWLINE = '\n';
const SPACE = ' ';
const SLASH = '/';
const ASTERISK = '*';
const LESS = '<';
const DASH = '-';
const QUOTE = '\'';
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
const BACKSLASH = '\\';

/**
 * A range of the text as spaces, its line breaks kept: the same length and the same lines, so positions and line
 * numbers after it stay the original's.
 *
 * @param source - the text
 * @param from - where the range starts
 * @param to - where it ends (not included)
 * @returns `to - from` characters: spaces, and `\n` where the text has one
 *
 * @example
 * blankSpan('a /* x *\/ b', 2, 9);   // => '       '
 * blankSpan('/* a\nb *\/', 0, 9);    // => '    \n    '
 */
export function blankSpan(
  source: string, from: number, to: number,
): string {
  let at = source.indexOf(NEWLINE, from);
  if (at < 0 || at >= to) {
    return spaces(to - from);
  }
  let out = '';
  for (; at > -1 && at < to; at = source.indexOf(NEWLINE, from)) {
    out += spaces(at - from) + NEWLINE;
    from = at + 1;
  }
  return out + spaces(to - from);
}

/** One run of spaces for every blank: a slice of it isn't a copy, so a comment costs no string of its own. */
let $$spaces = SPACE.repeat(256);

/** `count` spaces. */
function spaces(count: number): string {
  count > $$spaces.length && ($$spaces = SPACE.repeat(count * 2));
  return $$spaces.slice(0, count);
}

/**
 * The text with its comments as spaces: `//` to the end of the line, `/* *\/` (and so JSX's `{/* *\/}`), `<!-- -->`.
 * The length and the line breaks are kept, so every position is the original's. Strings (`'…'`, `"…"`, `` `…` ``) are
 * skipped whole: `'https://x'` holds no comment. With no comment the text itself comes back, with nothing joined.
 *
 * `onComment` reads each comment before it is blanked, in the order of the text, with its range `[from, to)`: what a
 * comment says is the caller's (minotation's `@mn` markers), so the core knows no marker.
 *
 * A text reader, not a parser: a regular expression's literal (`/"/`) or a template nested in a template's `${…}` can
 * mislead it, as any reader that doesn't parse the language.
 *
 * @param source - the text
 * @param out - what `onComment` writes to
 * @param onComment - reads one comment
 * @returns the text, its comments as spaces
 *
 * @example
 * blankComments('a /* x *\/ b');                       // => 'a         b'
 * blankComments("url('https://x') // y");             // => "url('https://x')     "
 * const said: string[] = [];
 * blankComments('// @mn p10', said, (out, text, from, to) => out.push(text.slice(from + 3, to)));
 * // said: [' @mn p10']
 */
export function blankComments<O>(
  source: string, out?: O, onComment?: TCommentVisit<O>,
): string {
  const l = source.length;
  // The pieces between the comments. Empty while no comment was met — then the text itself comes back.
  let parts: string[] | 0 = 0;
  let kept = 0;
  let i = 0;
  let ch: string;
  let quote: string;
  let from: number;
  while (i < l) {
    ch = source[i];
    if (ch === QUOTE || ch === DOUBLE_QUOTE || ch === BACKTICK) {
      quote = ch;
      for (i++; i < l; i++) {
        if (source[i] === BACKSLASH) {
          i++;
          continue;
        }
        if (source[i] === quote) {
          break;
        }
      }
      i++;
      continue;
    }
    if (ch !== SLASH && ch !== LESS) {
      i++;
      continue;
    }
    from = i;
    if (ch === SLASH && source[i + 1] === SLASH) {
      while (i < l && source[i] !== NEWLINE) {
        i++;
      }
    } else if (ch === SLASH && source[i + 1] === ASTERISK) {
      for (i += 2; i < l; i++) {
        if (source[i] === ASTERISK && source[i + 1] === SLASH) {
          i += 2;
          break;
        }
      }
    } else if (ch === LESS && source[i + 1] === '!' && source[i + 2] === DASH && source[i + 3] === DASH) {
      for (i += 4; i < l; i++) {
        if (source[i] === DASH && source[i + 1] === DASH && source[i + 2] === '>') {
          i += 3;
          break;
        }
      }
    } else {
      i++;
      continue;
    }
    onComment && onComment(
      out as O, source, from, i,
    );
    parts || (parts = []);
    parts.push(source.slice(kept, from), blankSpan(
      source, from, i,
    ));
    kept = i;
  }
  if (!parts) {
    return source;
  }
  parts.push(source.slice(kept));
  return parts.join('');
}
