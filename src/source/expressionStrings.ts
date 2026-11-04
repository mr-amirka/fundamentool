import {
  isIdentChar,
  isSpaceChar,
} from './names';
import type {
  TStringPush,
} from './types';

const AND = '&&';
const QUESTION = '?';
const DOT = '.';
const EXCLAMATION = '!';
const DASH = '-';
const OPEN_PAREN = '(';
const CLOSE_PAREN = ')';
const OPEN_BRACKET = '[';
const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const QUOTE = '\'';
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
const BACKSLASH = '\\';

/**
 * The state of reading one expression, a tuple (it goes into every node): the text, the position, the caller's list
 * and push. A string that turns out not to be a value is cut back from `out` by its saved length, with no list per
 * node.
 */
type TExpressionState = [source: string, at: number, out: unknown[], push: TStringPush<unknown[]>];

const EXPR_SOURCE = 0;
const EXPR_AT = 1;
const EXPR_OUT = 2;
const EXPR_PUSH = 3;

/** The list a skipped template is read with: with no `push`, nothing is written to it. */
const SKIPPED: unknown[] = [];

/** The binary operators, longer before shorter: `===` must not be read as `==`. */
const BINARY_OPERATORS = [
  '===',
  '!==',
  AND,
  '||',
  '??',
  '==',
  '!=',
  '<=',
  '>=',
  '<',
  '>',
  '+',
  DASH,
  '*',
  '/',
  '%',
  '|',
  '&',
  '^',
];

/** The first characters of {@link BINARY_OPERATORS}. */
const OPERATOR_STARTS: Record<string, 1> = {
  '=': 1,
  '!': 1,
  '&': 1,
  '|': 1,
  '?': 1,
  '<': 1,
  '>': 1,
  '+': 1,
  '-': 1,
  '*': 1,
  '/': 1,
  '%': 1,
  '^': 1,
};

/**
 * The strings an expression starting at `at` can be, without running it — each into `out` through `push`.
 *
 * - `cond ? 'a' : 'b'` gives both branches (nested ones too), and not the condition: in `v === 'splash' ? …` the
 *   string `'splash'` is an operand of a comparison;
 * - `cond && 'a'` gives the right side; `a || 'b'` and `a ?? 'b'` give both;
 * - parentheses are read through; a template gives its static pieces and what its `${…}` can be;
 * - a call, an index, a property, a concatenation, a unary operator give nothing: their value is known at run time.
 *
 * A string is pushed as written between its quotes. The reading stops at the first character the expression can't go
 * on with (`}`, `)`, `,`, `;`, `=>`, the next statement). An empty or broken expression gives nothing.
 *
 * @param source - the text
 * @param at - where the expression starts
 * @param out - the caller's list
 * @param push - writes one string into `out`
 * @returns the position right after the expression
 *
 * @example
 * const out: string[] = [];
 * expressionStrings("v === 'splash' ? 'bg1 cF' : 'fx1' }", 0, out, (list, text) => list.push(text));   // => 34
 * // out: ['bg1 cF', 'fx1']
 */
export function expressionStrings<O extends unknown[]>(
  source: string, at: number, out: O, push: TStringPush<O>,
): number {
  const state: TExpressionState = [
    source,
    at,
    out,
    push as TStringPush<unknown[]>,
  ];
  readConditional(state);
  return state[EXPR_AT];
}

/** Skips spaces and line breaks. */
function skipSpaces(state: TExpressionState): void {
  const source = state[EXPR_SOURCE];
  const l = source.length;
  let i = state[EXPR_AT];
  while (i < l && isSpaceChar(source[i])) {
    i++;
  }
  state[EXPR_AT] = i;
}

/** `cond ? a : b` — the condition cut off, the branches kept; with no `:` the expression is broken, all cut off. */
function readConditional(state: TExpressionState): void {
  const source = state[EXPR_SOURCE];
  const out = state[EXPR_OUT];
  const mark = out.length;
  readBinary(state, 0);
  skipSpaces(state);
  const i = state[EXPR_AT];
  if (source[i] !== QUESTION || source[i + 1] === QUESTION || source[i + 1] === DOT) {
    return;
  }
  out.length = mark;
  state[EXPR_AT] = i + 1;
  readConditional(state);
  skipSpaces(state);
  if (source[state[EXPR_AT]] !== ':') {
    out.length = mark;
    return;
  }
  state[EXPR_AT]++;
  readConditional(state);
}

/** The operator at `at`, or `''`; `=>` and `=` are not operators here. */
function binaryOperator(source: string, at: number): string {
  // After an operand there is almost always `}`, `)`, `,` or the end: no operator starts with them, no search.
  if (OPERATOR_STARTS[source[at]] !== 1) {
    return '';
  }
  const l = BINARY_OPERATORS.length;
  let i = 0;
  let operator: string;
  for (; i < l; i++) {
    operator = BINARY_OPERATORS[i];
    if (source.startsWith(operator, at)) {
      return operator;
    }
  }
  return '';
}

/** The precedence: `??` and `||` — 1, `&&` — 2, the rest (comparisons, arithmetic) — 3. */
function precedence(operator: string): number {
  return operator === '||' || operator === '??' ? 1 : operator === AND ? 2 : 3;
}

/**
 * A chain of binary operators of at least `minPrecedence`: `a && b` — the value from `b`; `a || b`, `a ?? b` — from
 * both; the rest (`===`, `+`) compute a value, so both sides are cut off.
 */
function readBinary(state: TExpressionState, minPrecedence: number): void {
  const source = state[EXPR_SOURCE];
  const out = state[EXPR_OUT];
  const mark = out.length;
  let operator: string;
  let level: number;
  readOperand(state);
  for (;;) {
    skipSpaces(state);
    operator = binaryOperator(source, state[EXPR_AT]);
    if (!operator) {
      return;
    }
    level = precedence(operator);
    if (level < minPrecedence) {
      return;
    }
    state[EXPR_AT] += operator.length;
    if (operator === AND) {
      out.length = mark;
      readBinary(state, level + 1);
    } else if (level === 1) {
      readBinary(state, level + 1);
    } else {
      readBinary(state, level + 1);
      out.length = mark;
    }
  }
}

/**
 * An operand — a string, a template, parentheses, a name or a number — and its tail of calls and properties. With a
 * tail the value is computed (`'a b'.trim()`), so its strings are cut off.
 */
function readOperand(state: TExpressionState): void {
  const source = state[EXPR_SOURCE];
  const out = state[EXPR_OUT];
  const mark = out.length;
  skipSpaces(state);
  let i = state[EXPR_AT];
  const ch = source[i];
  if (ch === EXCLAMATION || ch === '~' || ch === '+' || ch === DASH) {
    // A unary operator: the value is no longer a string.
    state[EXPR_AT] = i + 1;
    readOperand(state);
    out.length = mark;
    return;
  }
  if (ch === OPEN_PAREN) {
    state[EXPR_AT] = i + 1;
    readConditional(state);
    skipSpaces(state);
    source[state[EXPR_AT]] === CLOSE_PAREN && state[EXPR_AT]++;
  } else if (ch === QUOTE || ch === DOUBLE_QUOTE) {
    i = skipString(source, i);
    state[EXPR_PUSH](out, source.slice(state[EXPR_AT] + 1, i - 1));
    state[EXPR_AT] = i;
  } else if (ch === BACKTICK) {
    state[EXPR_AT] = readTemplate(
      source, i, out, state[EXPR_PUSH],
    );
  } else if (isIdentChar(ch) || ch === DOT) {
    const l = source.length;
    while (i < l && (isIdentChar(source[i]) || source[i] === DOT)) {
      i++;
    }
    state[EXPR_AT] = i;
  } else {
    return;
  }
  readPostfix(state) && (out.length = mark);
}

/** Calls, indexes and properties after an operand; `true` — there was one. */
function readPostfix(state: TExpressionState): boolean {
  const source = state[EXPR_SOURCE];
  const l = source.length;
  let i = state[EXPR_AT];
  const start = i;
  let ch: string;
  for (;;) {
    ch = source[i];
    if (ch === OPEN_PAREN || ch === OPEN_BRACKET) {
      i = skipBalanced(source, i);
    } else if (ch === DOT || (ch === QUESTION && source[i + 1] === DOT)) {
      i += ch === DOT ? 1 : 2;
      while (i < l && isIdentChar(source[i])) {
        i++;
      }
    } else if (ch === EXCLAMATION && source[i + 1] !== '=') {
      // TypeScript's `value!`: "not null".
      i++;
    } else {
      break;
    }
  }
  state[EXPR_AT] = i;
  return i > start;
}

/**
 * The position after the closing quote of a string opened at `at`; the end of the text when it isn't closed.
 *
 * @param source - the text
 * @param at - the opening quote
 */
export function skipString(source: string, at: number): number {
  const quote = source[at];
  const l = source.length;
  let i = at + 1;
  for (; i < l; i++) {
    if (source[i] === BACKSLASH) {
      i++;
      continue;
    }
    if (source[i] === quote) {
      return i + 1;
    }
  }
  return l;
}

/**
 * A template opened at `at`: its static pieces into `out`, each `${…}` read as an expression (`` `p10 ${on ? 'cF' :
 * 'c0'}` `` gives `p10 `, `cF`, `c0`). A substitution read short of its `}` gives nothing. Without `push` the template
 * is only skipped.
 *
 * @param source - the text
 * @param at - the opening backtick
 * @param out - the caller's list
 * @param push - writes one string; none — skip
 * @returns the position after the closing backtick
 */
export function readTemplate(
  source: string, at: number, out: unknown[], push: TStringPush<unknown[]> | undefined,
): number {
  const l = source.length;
  let i = at + 1;
  let from = i;
  for (; i < l; i++) {
    if (source[i] === BACKSLASH) {
      i++;
      continue;
    }
    if (source[i] === BACKTICK) {
      push && push(out, source.slice(from, i));
      return i + 1;
    }
    if (source[i] === '$' && source[i + 1] === OPEN_BRACE) {
      push && push(out, source.slice(from, i));
      i = push ? readSubstitution(
        source, i + 1, out, push,
      ) : skipBalanced(source, i + 1) - 1;
      from = i + 1;
    }
  }
  return l;
}

/** A substitution `${…}` whose `{` is at `at`: its value's strings into `out`. → the position of its `}`. */
function readSubstitution(
  source: string, at: number, out: unknown[], push: TStringPush<unknown[]>,
): number {
  const mark = out.length;
  // The reading eats the spaces after the expression: next is `}`, or what it stopped on.
  const i = expressionStrings(
    source, at + 1, out, push,
  );
  if (source[i] === CLOSE_BRACE) {
    return i;
  }
  out.length = mark;
  return skipBalanced(source, at) - 1;
}

/**
 * The position after the bracket that closes the one opened at `at`; strings and templates inside are skipped.
 *
 * @param source - the text
 * @param at - an opening bracket: `(`, `[` or `{`
 */
export function skipBalanced(source: string, at: number): number {
  const l = source.length;
  let depth = 0;
  let i = at;
  let ch: string;
  for (; i < l; i++) {
    ch = source[i];
    if (ch === OPEN_PAREN || ch === OPEN_BRACKET || ch === OPEN_BRACE) {
      depth++;
    } else if (ch === CLOSE_PAREN || ch === ']' || ch === CLOSE_BRACE) {
      if (!--depth) {
        return i + 1;
      }
    } else if (ch === QUOTE || ch === DOUBLE_QUOTE) {
      i = skipString(source, i) - 1;
    } else if (ch === BACKTICK) {
      i = readTemplate(
        source, i, SKIPPED, undefined,
      ) - 1;
    }
  }
  return l;
}
