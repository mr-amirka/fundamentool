import {
  array,
  lazy,
  object,
  string,
} from '../schema';
import {
  expressionStrings,
  readTemplate,
} from './expressionStrings';
import {
  isIdentChar,
  isSpaceChar,
  namePatternSource,
} from './names';
import type {
  TSourceStrings,
  TStringPlaces,
  TStringPush,
} from './types';

const WHERE = '[fundamentool/source] sourceStringsProvider';
const ASTERISK = '*';
const EQUALS = '=';
const QUOTE = '\'';
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
const BACKSLASH = '\\';
const OPEN_PAREN = '(';
const CLOSE_PAREN = ')';
const OPEN_BRACKET = '[';
const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';

/** A name, or a pattern `*Ending` with at least one character after `*`. */
const namePattern = () => string().refine((value) => value.length > (value[0] === ASTERISK ? 1 : 0),
  (value) => (value ? 'expects a pattern with an ending after "*", as "*Class", got "*"'
    : 'expects a name or a pattern "*Ending", got an empty string'));

/** The places' schema (lab D-023) — `STRING_PLACES().keys` is the list of their keys. */
export const STRING_PLACES = /*#__PURE__*/ lazy(() => object({
  attrs: array(namePattern()).optional(),
  variables: array(namePattern()).optional(),
  calls: array(namePattern()).optional(),
}));

/**
 * The attribute's value in one of its forms; the left boundary keeps `Name` from matching `className=` and `class`
 * from matching `data-class=`. `[:=]` — an attribute (`attr=`) or an object key (`attr:`, nested ones too). The groups:
 * 1–4 — a string as is (`"…"`, `'…'`, `{'…'}`, `{"…"}`); 5 — an expression in braces; 6 — an expression with none
 * (an object key's value).
 */
export function attrRegExp(pattern: string): RegExp {
  return new RegExp('(?<![\\w$-])' + namePatternSource(pattern) + '\\s*[:=]\\s*(?:"([^"]*)"'
    + '|\'([^\']*)\''
    + '|\\{\\s*\'([^\']*)\'\\s*\\}'
    + '|\\{\\s*"([^"]*)"\\s*\\}'
    + '|(\\{)'
    + '|()(?=[^\\s\'"{=>]))',
  'g');
}

/**
 * The strings at attributes of these patterns: a string as is, an expression by {@link expressionStrings}.
 *
 * @param source - the text
 * @param regexps - one per pattern, from {@link attrRegExp}
 * @param out - the caller's list
 * @param push - writes one string
 */
export function readAttrs(
  source: string, regexps: RegExp[], out: unknown[], push: TStringPush<unknown[]>,
): void {
  const l = regexps.length;
  let i = 0;
  let regexp: RegExp;
  let match: RegExpExecArray | null;
  for (; i < l; i++) {
    regexp = regexps[i];
    // One expression serves every file, and `g` keeps a position: without the reset the next file starts mid-way.
    regexp.lastIndex = 0;
    while ((match = regexp.exec(source))) {
      if (match[5] !== undefined || match[6] !== undefined) {
        regexp.lastIndex = expressionStrings(
          source, regexp.lastIndex, out, push,
        );
        continue;
      }
      // One of the four string forms matched — there is no match otherwise.
      push(out, (match[1] ?? match[2] ?? match[3] ?? match[4]) as string);
    }
  }
}

/** `=` at `at` assigns: it isn't part of `==`, `===`, `!=`, `<=`, `>=` or `=>`. */
function isAssignment(source: string, at: number): boolean {
  const next = source[at + 1];
  const prev = source[at - 1];
  return source[at] === EQUALS
    && next !== EQUALS && next !== '>'
    && prev !== EQUALS && prev !== '!' && prev !== '<' && prev !== '>';
}

/**
 * The strings of variables and object keys of these names: `const aClass = '…'`, `const aClass: string = '…'`,
 * `{ aClass: '…' }`, the value a string or an expression.
 *
 * By hand, not by a regular expression: a leading `[\w$]*` made the engine try every length of the name at every
 * position of the file.
 */
function readVariables(
  source: string, names: string[], exact: boolean[], out: unknown[], push: TStringPush<unknown[]>,
): void {
  const count = names.length;
  const l = source.length;
  let si = 0;
  let name: string;
  let isExact: boolean;
  let nameLength: number;
  let from: number;
  let at: number;
  let i: number;
  let quote: string;
  let valueFrom: number;
  for (; si < count; si++) {
    name = names[si];
    isExact = exact[si];
    nameLength = name.length;
    from = 0;
    while ((at = source.indexOf(name, from)) !== -1) {
      i = at + nameLength;
      from = i;
      // `thClassy` — the ending goes on, another name; `my_rowStyles` — an exact name with another start; `Class` — a
      // pattern with no start.
      if (i < l && isIdentChar(source[i])
        || (isExact ? at && isIdentChar(source[at - 1]) : !at || !isIdentChar(source[at - 1]))) {
        continue;
      }
      while (i < l && isSpaceChar(source[i])) {
        i++;
      }
      if (source[i] === ':') {
        // An object key (`{ aClass: '…' }`) or a type (`const aClass: string = '…'`): what follows tells.
        i++;
        while (i < l && isSpaceChar(source[i])) {
          i++;
        }
        quote = source[i];
        if (quote !== QUOTE && quote !== DOUBLE_QUOTE && quote !== BACKTICK) {
          // A type goes to `=`, stopping at `;` and a line break. It didn't (or `=` is part of `===` or `=>`): an
          // object key with an expression, `{ aClass: on ? 'a' : 'b' }`.
          at = i;
          while (i < l && source[i] !== EQUALS && source[i] !== ';' && source[i] !== '\n') {
            i++;
          }
          if (!isAssignment(source, i)) {
            from = expressionStrings(
              source, at, out, push,
            );
            continue;
          }
          i++;
          while (i < l && isSpaceChar(source[i])) {
            i++;
          }
        }
      } else if (isAssignment(source, i)) {
        i++;
        while (i < l && isSpaceChar(source[i])) {
          i++;
        }
      } else {
        continue;
      }
      quote = source[i];
      if (quote !== QUOTE && quote !== DOUBLE_QUOTE) {
        // An expression; a template too — its substitutions are read.
        from = expressionStrings(
          source, i, out, push,
        );
        continue;
      }
      valueFrom = ++i;
      for (; i < l; i++) {
        if (source[i] === BACKSLASH) {
          i++;
          continue;
        }
        if (source[i] === quote) {
          break;
        }
      }
      push(out, source.slice(valueFrom, i));
      from = i;
    }
  }
}

/** The start of each name's next call — shared by every file, no list per file. */
const $$callStarts: number[] = [];
/** The opening parenthesis of the same call. */
const $$callParens: number[] = [];

/**
 * The next call of a function of this name from `from`: an exact name as is, a pattern's ending with at least one
 * character before it (`thClass`). On the left — not a name's character and not `.` (`myMne`, `obj.mne`); on the
 * right — not a name's character (`mne2`), then spaces and `(`. Writes the call's start and parenthesis at `j`, or
 * `-1` when there are no more.
 *
 * `indexOf` of the name, not a regular expression: `[\w$]+Class` tried every length of the name at every position.
 */
function findCall(
  source: string, name: string, exact: boolean, from: number, j: number,
): void {
  const l = source.length;
  const nameLength = name.length;
  let at: number;
  let start: number;
  let i: number;
  while ((at = source.indexOf(name, from)) !== -1) {
    from = at + 1;
    start = at;
    if (!exact) {
      while (start && isIdentChar(source[start - 1])) {
        start--;
      }
      if (start === at) {
        continue;
      }
    } else if (start && isIdentChar(source[start - 1])) {
      continue;
    }
    i = at + nameLength;
    if (start && source[start - 1] === '.' || i < l && isIdentChar(source[i])) {
      continue;
    }
    while (i < l && isSpaceChar(source[i])) {
      i++;
    }
    if (source[i] === OPEN_PAREN) {
      $$callStarts[j] = start;
      $$callParens[j] = i;
      return;
    }
  }
  $$callStarts[j] = -1;
}

/**
 * The string arguments of calls of these names, nested ones included: `mne(base, cond ? a : mne(x, 'p10'))`. The
 * calls are read in the order of the text, as one regular expression would: of the next call of each name the nearest
 * is taken, and a name whose call lies inside the one read is searched again after its end. Inside a call — by
 * characters, since nested brackets aren't regular.
 */
function readCalls(
  source: string, names: string[], exact: boolean[], out: unknown[], push: TStringPush<unknown[]>,
): void {
  const count = names.length;
  const l = source.length;
  let i: number;
  let j: number;
  let next: number;
  let depth: number;
  let ch: string;
  let quote: string;
  let from: number;
  for (j = 0; j < count; j++) {
    findCall(
      source, names[j], exact[j], 0, j,
    );
  }
  for (;;) {
    next = -1;
    for (j = 0; j < count; j++) {
      $$callStarts[j] > -1 && (next < 0 || $$callStarts[j] < $$callStarts[next]) && (next = j);
    }
    if (next < 0) {
      return;
    }
    i = $$callParens[next];
    depth = 0;
    for (; i < l; i++) {
      ch = source[i];
      if (ch === OPEN_PAREN || ch === OPEN_BRACKET || ch === OPEN_BRACE) {
        depth++;
        continue;
      }
      if (ch === CLOSE_PAREN || ch === ']' || ch === CLOSE_BRACE) {
        if (!--depth) {
          break;
        }
        continue;
      }
      if (ch === BACKTICK) {
        // A template: its static pieces and what its substitutions can be.
        i = readTemplate(
          source, i, out, push,
        ) - 1;
        continue;
      }
      if (ch !== QUOTE && ch !== DOUBLE_QUOTE) {
        continue;
      }
      // The string's bounds, cut by one `slice`: joining it by characters costs a string per character.
      quote = ch;
      from = ++i;
      for (; i < l; i++) {
        if (source[i] === BACKSLASH) {
          i++;
          continue;
        }
        if (source[i] === quote) {
          break;
        }
      }
      push(out, source.slice(from, i));
    }
    // Next — after the end of the call read, not inside it.
    for (j = 0; j < count; j++) {
      $$callStarts[j] > -1 && $$callStarts[j] < i && findCall(
        source, names[j], exact[j], i, j,
      );
    }
  }
}

/**
 * Patterns split into what the search looks for and how: an exact name as is, a pattern by its ending.
 *
 * @param patterns - exact names and `*Ending` patterns
 * @returns the names to search, and for each whether it is exact
 */
export function searchNames(patterns: readonly string[] | undefined): [names: string[], exact: boolean[]] {
  const names: string[] = [];
  const exact: boolean[] = [];
  if (patterns) {
    for (const pattern of patterns) {
      exact.push(pattern[0] !== ASTERISK);
      names.push(pattern[0] === ASTERISK ? pattern.slice(1) : pattern);
    }
  }
  return [
    names,
    exact,
  ];
}

/**
 * A reader of a file's strings at its places, made once: the options checked in development, the regular expressions
 * and name lists built here, so a file costs only its reading.
 *
 * - **attrs** — `class="p10"`, `class='p10'`, `className={'p10'}`, `` className={`p10 ${on ? 'cF' : 'c0'}`} ``,
 *   `className={on ? 'a' : 'b'}`, `{ className: 'p10' }` (nested ones too), and markup inside a string
 *   (`` html`<div class="p10">` ``);
 * - **variables** — `const rowClass = 'p10'`, `const rowClass: string = '…'`, `{ rowClass: on && 'a' }`;
 * - **calls** — every string argument, nested ones included: `mne(base, cond ? 'a' : mne(x, 'p10'))`.
 *
 * An expression gives the strings it can be ({@link expressionStrings}). The reader finds names in the text as it is:
 * comments go first through `blankComments`, if they shouldn't count. The strings come in the order of the places:
 * all of `attrs`, then `variables`, then `calls`.
 *
 * @param places - the names and `*Ending` patterns of each place; a place left out or empty isn't read
 * @returns the reader `(source, out, push) => void`
 * @throws {TypeError} in development, on an unknown key or a wrong value
 *
 * @example
 * const strings = sourceStringsProvider({ attrs: ['class', '*ClassName'], variables: ['*Class'], calls: ['mne'] });
 * const out: string[] = [];
 * strings('<b class="p10" iconClassName={on && "w5"} /> mne(x, \'cF\')', out, (list, text) => list.push(text));
 * // out: ['p10', 'w5', 'cF']
 */
export function sourceStringsProvider(places: TStringPlaces): TSourceStrings {
  if (process.env.NODE_ENV !== 'production') {
    STRING_PLACES().parse(places, WHERE);
  }
  const attrs = (places.attrs || []).map(attrRegExp);
  const [
    variables,
    variablesExact,
  ] = searchNames(places.variables);
  const [
    calls,
    callsExact,
  ] = searchNames(places.calls);
  const hasAttrs = attrs.length > 0;
  const hasVariables = variables.length > 0;
  const hasCalls = calls.length > 0;
  return <O extends unknown[]>(source: string, out: O, push: TStringPush<O>): void => {
    const write = push as TStringPush<unknown[]>;
    hasAttrs && readAttrs(
      source, attrs, out, write,
    );
    hasVariables && readVariables(
      source, variables, variablesExact, out, write,
    );
    hasCalls && readCalls(
      source, calls, callsExact, out, write,
    );
  };
}
