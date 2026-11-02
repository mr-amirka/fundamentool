import {
  escapeRegExp,
} from './escapeRegExp';
import {
  array,
  func,
  lazy,
  object,
  string,
  tuple,
} from './schema';

/**
 * A bracket that doesn't fit, reported by {@link bracketPairs}' `onUnbalanced`; `index` is where the bracket is in
 * `input`:
 * - `stray` — a closing bracket with nothing open;
 * - `mismatch` — a closing bracket of another pair than the one open (`expected` closes it);
 * - `unclosed` — an opening bracket never closed, met at the end of what was read.
 */
export type TBracketProblem = {
  kind: 'stray';
  got: string;
  index: number;
  input: string;
} | {
  kind: 'mismatch';
  expected: string;
  got: string;
  index: number;
  input: string;
} | {
  kind: 'unclosed';
  open: string;
  expected: string;
  index: number;
  input: string;
};

/** Options of {@link bracketPairs}. */
export type TBracketPairsOptions = {
  /** Called for each bracket that doesn't fit; the bracket is then skipped. Not given — skipped silently. */
  onUnbalanced?: (problem: TBracketProblem) => void;
};

/**
 * Brackets as a splitter takes them (`escapedSplitProvider`, `escapedHalfProvider`): the splitter only finds them
 * and asks what each one does. The stack is the splitter's, one per call: `[pair, index, pair, index, …]` of the
 * brackets open.
 */
export type TBrackets = {
  /** The regular expression's source matching any bracket, the longest first. */
  readonly source: string;
  /**
   * Meets a bracket: opens, closes, or reports it and skips it.
   *
   * @returns The stack's new length: `0` — nothing is open.
   */
  readonly meet: (stack: number[], text: string, index: number, input: string) => number;
  /** The end of what was read: reports each bracket still open. */
  readonly end: (stack: number[], input: string) => void;
};

/** The arguments' schemas (lab D-023) — `BRACKET_PAIRS_OPTIONS().keys` is the list of the keys. */
export const BRACKET_PAIRS_OPTIONS = /*#__PURE__*/ lazy(() => object({
  onUnbalanced: func().optional(),
}));

const PAIRS = /*#__PURE__*/ lazy(() => {
  const text = string().refine((value) => value.length > 0, 'expects a bracket, got an empty string');
  return array(tuple([
    text,
    text,
  ]).refine((pair) => pair[0] !== pair[1], (pair) => 'expects an opening and a closing bracket that differ, got "'
    + pair[0] + '" twice'))
    .refine((pairs) => pairs.length > 0, 'expects at least one pair')
    .refine((pairs) => repeated(pairs) === undefined, (pairs) => 'expects each bracket once, got "' + repeated(pairs)
      + '" twice');
});

/** The first bracket met twice among the pairs' texts. */
function repeated(pairs: readonly (readonly [string, string])[]): string | undefined {
  const seen = new Set<string>();
  for (const pair of pairs) {
    for (const text of pair) {
      if (seen.has(text)) {
        return text;
      }
      seen.add(text);
    }
  }
  return undefined;
}

const WHERE = '[fundamentool] bracketPairs';

/**
 * Brackets for a splitter: pairs of an opening and a closing bracket of any length. A separator inside an open pair
 * is part of the value. Each closing bracket closes its own partner (a stack, not a counter); the longest bracket is
 * matched first, so `{{` wins over `{`. A bracket that doesn't fit is reported through `onUnbalanced` and skipped —
 * never thrown: the splitters run on hot paths, and the caller decides what a problem means.
 *
 * @param pairs - `[opening, closing]` pairs; each text once.
 * @param options - `onUnbalanced`: what to do with a bracket that doesn't fit.
 * @returns The brackets, for `escapedSplitProvider({ brackets })` and `escapedHalfProvider({ brackets })`.
 * @example
 * const split = escapedSplitProvider({ separator: ',', brackets: bracketPairs([['(', ')'], ['{{', '}}']]) });
 * split.base('a(1,2),{{b,c}},d'); // => ['a(1,2)', '{{b,c}}', 'd']
 * split.base('a)b,c');            // => ['a)b', 'c'] — the stray `)` is skipped
 *
 * const problems: TBracketProblem[] = [];
 * const report = bracketPairs([['(', ')']], { onUnbalanced: (problem) => problems.push(problem) });
 * escapedSplitProvider({ separator: ',', brackets: report }).base('a(b,c');
 * // => ['a(b,c'];  problems: [{ kind: 'unclosed', open: '(', expected: ')', index: 1, input: 'a(b,c' }]
 */
export function bracketPairs(pairs: readonly (readonly [string, string])[], options?: TBracketPairsOptions): TBrackets {
  if (process.env.NODE_ENV !== 'production') {
    PAIRS().parse(pairs, WHERE + ' pairs');
    BRACKET_PAIRS_OPTIONS().optional().parse(options, WHERE);
  }
  const onUnbalanced = options && options.onUnbalanced;
  const openings: string[] = [];
  const closings: string[] = [];
  // A text's role: pair + 1 opens it, -(pair + 1) closes it.
  const roles: Record<string, number> = Object.create(null);
  const texts: string[] = [];
  let pair = 0;
  for (const [
    open,
    close,
  ] of pairs) {
    openings.push(open);
    closings.push(close);
    roles[open] = ++pair;
    roles[close] = -pair;
    texts.push(open, close);
  }
  texts.sort((a, b) => b.length - a.length);

  return {
    source: texts.map(escapeRegExp).join('|'),
    meet(
      stack, text, index, input,
    ) {
      const role = roles[text];
      const l = stack.length;
      if (l && role === -1 - stack[l - 2]) {
        stack.length = l - 2;
        return l - 2;
      }
      if (role > 0) {
        stack.push(role - 1, index);
        return l + 2;
      }
      onUnbalanced && onUnbalanced(l ? {
        kind: 'mismatch',
        expected: closings[stack[l - 2]],
        got: text,
        index,
        input,
      } : {
        kind: 'stray',
        got: text,
        index,
        input,
      });
      return l;
    },
    end(stack, input) {
      if (onUnbalanced) {
        const l = stack.length;
        for (let i = 0; i < l; i += 2) {
          onUnbalanced({
            kind: 'unclosed',
            open: openings[stack[i]],
            expected: closings[stack[i]],
            index: stack[i + 1],
            input,
          });
        }
      }
    },
  };
}
