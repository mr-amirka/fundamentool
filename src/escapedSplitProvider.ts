import {
  regexpNormalizeText,
} from './regexpNormalizeText';
import {
  escapeRegExp,
} from './escapeRegExp';
import {
  unslash,
} from './unslash';
import {
  map,
} from './map';
import {
  isRegExp,
} from './is/isRegExp';
import {
  custom,
  lazy,
  object,
  string,
  union,
} from './schema';

/** Options of {@link escapedSplitProvider} and `escapedHalfProvider`. */
export type TEscapedSplitOptions = {
  /** Where to split: a string as written, or a `RegExp` (its source; the flags are ignored). */
  separator: string | RegExp;
  /** What is never a separator and stays in the part as is: default — a backslash and the character after it. */
  escape?: string | RegExp;
  /**
   * Bracket pairs, each an opening and a closing character: `'()[]{}'`. A separator inside a pair is part of the
   * value: with `'()'`, `a(1,2),b` splits at the second comma only. A closing bracket with no opening one counts down
   * all the same, so what follows it is inside until an opening bracket evens it out.
   */
  brackets?: string;
};

/** A splitter that respects escaped separators (and brackets, when given). */
export interface IEscapedSplit {
  /**
   * Splits the input; each part unescaped (`unslash`).
   *
   * @param input - The input string to split.
   * @param dstSeparators - Collects the separators met, in order.
   * @returns The parts.
   */
  (input: string, dstSeparators?: string[]): string[];

  /**
   * Splits the input; the parts as written, escapes kept.
   *
   * @param input - The input string to split.
   * @param dstSeparators - Collects the separators met, in order.
   * @returns The parts.
   */
  base: (input: string, dstSeparators?: string[]) => string[];
}

/** The options' schema (D-051) — `ESCAPED_SPLIT_OPTIONS().keys` is the list of the keys. */
export const ESCAPED_SPLIT_OPTIONS = /*#__PURE__*/ lazy(() => {
  const pattern = union([
    string(),
    custom<RegExp>(isRegExp, 'a RegExp'),
  ]);
  return object({
    separator: pattern,
    escape: pattern.optional(),
    brackets: string().refine((value) => value.length % 2 === 0, 'expects pairs of an opening and a closing character, as "()[]"')
      .optional(),
  });
});

/**
 * The reader both splitters share: one regular expression over escapes, brackets and the separator, and the
 * brackets' openings (any other bracket matched is a closing one). Cold path — once per splitter.
 *
 * @param options - The splitter's options.
 * @param where - The splitter's name, for an error.
 * @returns `[regexp, openings]`: groups 1 — an escape, 2 — a bracket, 3 — a separator.
 * @internal
 */
export function escapedSplitReader(options: TEscapedSplitOptions, where: string): [RegExp, string] {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    ESCAPED_SPLIT_OPTIONS().parse(options, '[fundamentool] ' + where);
  }
  const brackets = options.brackets || '';
  let openings = '';
  let bracketSource = '';
  const l = brackets.length;
  for (let i = 0; i < l; i += 2) {
    openings += brackets[i];
    bracketSource += (bracketSource ? '|' : '') + escapeRegExp(brackets[i]) + '|' + escapeRegExp(brackets[i + 1]);
  }
  const escape = options.escape ? regexpNormalizeText(options.escape) : '\\\\.';
  return [
    new RegExp('(' + escape + ')|(' + (bracketSource || '(?!)') + ')|(' + regexpNormalizeText(options.separator)
      + ')', 'g'),
    openings,
  ];
}

/**
 * Creates a splitter that respects escaped separators and, with `brackets`, splits only outside them.
 *
 * @param options - The separator, the escape, the brackets.
 * @returns The splitter: the parts unescaped, or as written with `.base`.
 * @example
 * const split = escapedSplitProvider({ separator: ',' });
 * split('a,b,c');                  // => ['a', 'b', 'c']
 * split('a\\,b,c');                // => ['a,b', 'c']
 * escapedSplitProvider({ separator: ',', brackets: '(){}' }).base('a(1,2),$b{3,4}'); // => ['a(1,2)', '$b{3,4}']
 * escapedSplitProvider({ separator: /[<>]/ }).base('a<b>c');                          // => ['a', 'b', 'c']
 */
export function escapedSplitProvider(options: TEscapedSplitOptions): IEscapedSplit {
  const [
    regexp,
    openings,
  ] = escapedSplitReader(options, 'escapedSplitProvider');

  function escapedSplit(input: string, dstSeparators?: string[]): string[] {
    return map(base(input, dstSeparators), unslash) as string[];
  }

  const base = escapedSplit.base = (input: string, dstSeparators?: string[]): string[] => {
    const output: string[] = [];
    let from = 0;
    let depth = 0;
    let m: RegExpExecArray | null;
    regexp.lastIndex = 0;
    while ((m = regexp.exec(input))) {
      if (!m[0]) {
        regexp.lastIndex++;
      } else if (m[2]) {
        depth += openings.indexOf(m[2]) > -1 ? 1 : -1;
      } else if (m[3] !== undefined && !depth) {
        dstSeparators && dstSeparators.push(m[3]);
        output.push(input.slice(from, m.index));
        from = m.index + m[0].length;
      }
    }
    output.push(input.slice(from));
    return output;
  };

  return escapedSplit;
}
