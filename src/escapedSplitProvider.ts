import {
  regexpNormalizeText,
} from './regexpNormalizeText';
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
import type {
  TBrackets,
} from './bracketPairs';

/** Options of {@link escapedSplitProvider} and `escapedHalfProvider`. */
export type TEscapedSplitOptions = {
  /** Where to split: a string as written, or a `RegExp` (its source; the flags are ignored). */
  separator: string | RegExp;
  /** What is never a separator and stays in the part as is: default — a backslash and the character after it. */
  escape?: string | RegExp;
  /**
   * Brackets, from `bracketPairs`: a separator inside an open pair is part of the value — with
   * `bracketPairs([['(', ')']])`, `a(1,2),b` splits at the second comma only. A splitter without them carries no
   * bracket code.
   */
  brackets?: TBrackets;
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
    brackets: custom<TBrackets>(isBrackets, 'brackets from bracketPairs(…)').optional(),
  });
});

/** Is `value` what `bracketPairs` returns. */
function isBrackets(value: unknown): boolean {
  const brackets = value as TBrackets;
  return !!brackets && typeof brackets.source === 'string' && typeof brackets.meet === 'function'
    && typeof brackets.end === 'function';
}

/**
 * No brackets: the source never matches, so `meet` and `end` are never called.
 */
const NO_BRACKETS = {
  source: '(?!)',
} as TBrackets;

/**
 * The reader both splitters share: one regular expression over escapes, brackets and the separator, and the
 * brackets. Cold path — once per splitter.
 *
 * @param options - The splitter's options.
 * @param where - The splitter's name, for an error.
 * @returns `[regexp, brackets]`: the groups are 1 — an escape, 2 — a bracket, 3 — a separator.
 * @internal
 */
export function escapedSplitReader(options: TEscapedSplitOptions, where: string): [RegExp, TBrackets] {
  if (process.env.NODE_ENV !== 'production') {
    ESCAPED_SPLIT_OPTIONS().parse(options, '[fundamentool] ' + where);
  }
  const brackets = options.brackets || NO_BRACKETS;
  const escape = options.escape ? regexpNormalizeText(options.escape) : '\\\\.';
  return [
    new RegExp('(' + escape + ')|(' + brackets.source + ')|(' + regexpNormalizeText(options.separator) + ')', 'g'),
    brackets,
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
 * escapedSplitProvider({ separator: ',', brackets: bracketPairs([['(', ')'], ['{', '}']]) }).base('a(1,2),$b{3,4}');
 * // => ['a(1,2)', '$b{3,4}']
 * escapedSplitProvider({ separator: /[<>]/ }).base('a<b>c');                          // => ['a', 'b', 'c']
 */
export function escapedSplitProvider(options: TEscapedSplitOptions): IEscapedSplit {
  const [
    regexp,
    {
      meet,
      end,
    },
  ] = escapedSplitReader(options, 'escapedSplitProvider');

  function escapedSplit(input: string, dstSeparators?: string[]): string[] {
    return map(base(input, dstSeparators), unslash) as string[];
  }

  const base = escapedSplit.base = (input: string, dstSeparators?: string[]): string[] => {
    const output: string[] = [];
    let from = 0;
    let depth = 0;
    let stack: number[] | undefined;
    let m: RegExpExecArray | null;
    regexp.lastIndex = 0;
    while ((m = regexp.exec(input))) {
      if (!m[0]) {
        regexp.lastIndex++;
      } else if (m[2]) {
        depth = meet(
          stack || (stack = []), m[2], m.index, input,
        );
      } else if (m[3] !== undefined && !depth) {
        dstSeparators && dstSeparators.push(m[3]);
        output.push(input.slice(from, m.index));
        from = m.index + m[0].length;
      }
    }
    depth && end(stack as number[], input);
    output.push(input.slice(from));
    return output;
  };

  return escapedSplit;
}
