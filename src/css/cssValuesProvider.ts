import {
  camelToKebabCase,
} from '../camelToKebabCase';
import {
  color as colorCode,
} from '../color';
import {
  escapeRegExp,
} from '../escapeRegExp';
import {
  lowerFirst,
} from '../lowerFirst';
import {
  func,
  lazy,
  object,
  oneOf,
  record,
  string,
  tuple,
} from '../schema';
import {
  toFixed,
} from '../toFixed';
import type {
  TMathRules,
} from './mathRules';

const DOUBLE_QUOTE = '"';

/** A CSS math function and its arguments: [its CSS name, fewer is an error, more is an error]. */
type TFunction = [css: string, min: number, max: number];

/** The math functions CSS has, by name: how many arguments each takes. */
const CSS_FUNCTIONS: Record<string, [min: number, max: number]> = {
  min: [
    2,
    Infinity,
  ],
  max: [
    2,
    Infinity,
  ],
  clamp: [
    3,
    3,
  ],
};
const CSS_FUNCTION_NAMES = Object.keys(CSS_FUNCTIONS);

/** The names of a group's characters, for messages: "written in braces". */
const GROUP_WORDS: Record<string, string> = {
  '{': 'braces',
  '(': 'parentheses',
  '[': 'square brackets',
};

/** The spelling of a gradient: the separators of its colours, a stop, an angle, the radial and repeating forms. */
export type TCssGradientSpelling = {
  /** Between colours: `'-'` — `F00-00F`. One character. */
  readonly join: string;
  /** Before a colour's stop: `'p'` — `F00p40`. */
  readonly stop: string;
  /** Before the angle, at the end: `'_g'` — `F00-00F_g90`. */
  readonly angle: string;
  /** The radial form, at the end: `'_r'` — `_r`, `_r_ellipse_at_top`, `_rEllipse`. */
  readonly radial: string;
  /** The repeating form, at the very end: `'_rpt'`. */
  readonly repeat: string;
  /** Between the words of a radial shape: `'_'` — `ellipse_at_top` → `ellipse at top`, `closestSide` → `closest-side`. */
  readonly space: string;
};

/**
 * The options of {@link cssValuesProvider} — the spelling of the short text. All of it is the caller's: the core knows
 * only the mechanism (lab D-044), and there is no default spelling.
 */
export type TCssValuesOptions = {
  /** A group's characters: `['(', ')']` — `(1+2)*3`; a function's arguments and a variable's fallback use them too. */
  readonly group: readonly [open: string, close: string];
  /** Before a variable's name: `'$'` — `$gap` → `var(--gap)`. One character. */
  readonly variable: string;
  /** Before an environment variable's name: `'$$'` — `$$safe-area-inset-top` → `env(safe-area-inset-top)`. */
  readonly env: string;
  /** Ends a variable's name where it could go on: `';'` — `$a;-2` → `var(--a)` minus 2. One character. */
  readonly nameEnd: string;
  /** The math functions, as written → their CSS name: `{ min: 'min' }`, `{ Min: 'min' }`. */
  readonly functions: Readonly<Record<string, string>>;
  /** The spelling of a gradient. */
  readonly gradient: TCssGradientSpelling;
  /** Throws the caller's error with the message; by default a `TypeError` prefixed `[fundamentool/css]`. */
  readonly fail?: (message: string) => never;
  /** Called with the whole value where a term starts with `--`: the place for a hint about an older spelling. */
  readonly legacy?: (expr: string) => void;
};

/** The readers {@link cssValuesProvider} makes. They don't use `this`: `const { math, color } = css;` works. */
export type TCssValues = {
  /** A value with math → its CSS: `100%-2*$gap` → `calc(100% - 2 * var(--gap))`, `10` → `10px`. */
  readonly math: (expr: string, rules: TMathRules) => string;
  /** `1` — the last value `math` read had an operator outside a group (`1/2+32`, `$a*2`); otherwise `0`. */
  readonly bare: () => number;
  /** A whole value that is a variable → its CSS (`$a{10px}` → `var(--a, 10px)`); not a variable — `undefined`. */
  readonly variable: (s: string, fallback?: (raw: string) => string) => string | undefined;
  /** A colour: a variable (`$ink{F00}` → `var(--ink, #f00)`) or a code (`F00.5`); with `alt` — the fallback first. */
  readonly color: (v: string, alt?: boolean) => string[];
  /** A colour or a gradient of colours: `F00-00F_g90` → `linear-gradient(270deg,#f00 0%,#00f 100%)`. */
  readonly gradient: (input: string, alt?: boolean) => string[];
};

/** What a CSS name has: a character that can't stand in the spelling's places. */
const REGEXP_NAME_CHAR = /^[A-Za-z0-9_\-\u0080-￿]$/;
/** What math reads itself: numbers, units, operators, the argument separator. */
const REGEXP_MATH_CHAR = /^[0-9.%+\-*/,\s]$/;
/** A function as written: a letter, then lowercase letters — `min`, `Min`. */
const REGEXP_FUNCTION_NAME = /^[A-Za-z][a-z]*$/;

/** Why a math character of the spelling can't be one: `''` — it can. */
function charProblem(value: string): string {
  return value.length !== 1 ? 'expects one character, got "' + value + DOUBLE_QUOTE
    : REGEXP_NAME_CHAR.test(value) || REGEXP_MATH_CHAR.test(value)
      ? 'expects a character that is not part of a name or of math, got "' + value + DOUBLE_QUOTE : '';
}

/** A character of the spelling. */
const char = () => string().refine((value) => !charProblem(value), charProblem);
/** A piece of the gradient's spelling. */
const piece = () => string().refine((value) => value.length > 0, 'expects a non-empty string, got an empty string');

/** The options' schema (lab D-023) — `CSS_VALUES_OPTIONS().keys` is the list of their keys. */
export const CSS_VALUES_OPTIONS = /*#__PURE__*/ lazy(() => object({
  group: tuple([
    char(),
    char(),
  ]),
  variable: char(),
  env: piece(),
  nameEnd: char(),
  functions: record(oneOf(CSS_FUNCTION_NAMES)).refine((value) => Object.keys(value).every((name) => REGEXP_FUNCTION_NAME
    .test(name)), (value) => 'expects names of a letter and then lowercase letters, as "min" or "Min", got "'
      + Object.keys(value).filter((name) => !REGEXP_FUNCTION_NAME.test(name))[0] + DOUBLE_QUOTE),
  gradient: object({
    join: piece().refine((value) => value.length === 1, (value) => 'expects one character, got "' + value + DOUBLE_QUOTE),
    stop: piece(),
    angle: piece(),
    radial: piece(),
    repeat: piece(),
    space: piece(),
  }),
  fail: func().optional(),
  legacy: func().optional(),
}).refine((options) => !spellingClash(options as TCssValuesOptions), (options) => spellingClash(options as TCssValuesOptions)));

/** Two places of the spelling with one character: `''` — none. */
function spellingClash(options: TCssValuesOptions): string {
  const places: [string, string][] = [
    [
      'group[0]',
      options.group[0],
    ],
    [
      'group[1]',
      options.group[1],
    ],
    [
      'variable',
      options.variable,
    ],
    [
      'nameEnd',
      options.nameEnd,
    ],
  ];
  options.env[0] === options.variable || places.push([
    'env',
    options.env[0],
  ]);
  const count = places.length;
  let i = 0;
  let j: number;
  for (; i < count; i++) {
    for (j = i + 1; j < count; j++) {
      if (places[i][1] === places[j][1]) {
        return DOUBLE_QUOTE + places[i][0] + '" and "' + places[j][0] + '" are both "' + places[i][1] + '"';
      }
    }
  }
  return options.env === options.variable ? '"env" and "variable" are both "' + options.env + DOUBLE_QUOTE : '';
}

const WHERE = '[fundamentool/css] cssValuesProvider';
const FAIL_PREFIX = '[fundamentool/css] ';
/** The gradient's pieces are read in any case: `_G90`, `_RPT`. */
const IGNORE_CASE = 'i';

/** A provider's spelling, read once: what the hot path copies, what messages say, the gradient's expressions. */
type TState = {
  open: string;
  close: string;
  variable: string;
  env: string;
  envFirst: string;
  nameEnd: string;
  functions: Record<string, TFunction>;
  /** `min, max, clamp` — for the message about an unknown function. */
  functionNames: string;
  /** `braces` — for "written in …". */
  groupWord: string;
  /** What a value starts with — the hint when its first character doesn't fit. */
  termStart: string;
  fail: (message: string) => void;
  legacy: ((expr: string) => void) | undefined;
  join: string;
  repeat: RegExp;
  angle: RegExp;
  codeStop: RegExp;
  stop: RegExp;
  space: RegExp;
};

const DASH = '-';
const PLUS = '+';
const ASTERISK = '*';
const SLASH = '/';
const DOT = '.';
const COMMA = ',';
const PERCENT = '%';
const SPACE = ' ';
const ZERO = '0';
const NINE = '9';
const LOWER_A = 'a';
const LOWER_Z = 'z';
const UPPER_A = 'A';
const UPPER_Z = 'Z';
const OPEN_PAREN = '(';
const CLOSE_PAREN = ')';
const ARG_SEPARATOR = ', ';
const CALC_OPEN = 'calc(';
const VAR_OPEN = 'var(--';
const ENV_OPEN = 'env(';
const NEGATE = ' * -1';
const CIRCLE = 'circle';
const MSG_NOT_EXPECTED = ' is not expected';
/** How many units a message lists; more — an example with the bare number's unit. */
const UNITS_LISTED = 8;

/** A bare number: its unit comes from its place in the expression. */
const KIND_BARE = 0;
/** Everything else: a number with a unit, a fraction, a variable, a function, a group. */
const KIND_DIMENSION = 1;


// The spelling in use: copied from a provider's state when another provider's reader ran last — not per character.
let current: TState | undefined;
let OPEN = '';
let CLOSE = '';
let VARIABLE = '';
let ENV = '';
let ENV_FIRST = '';
let ENV_LENGTH = 0;
let NAME_END = '';
let FUNCTIONS: Record<string, TFunction> = {};

// The state of reading one value. In the module, not a closure: reading is synchronous and calls no outside code.
let src = '';
let pos = 0;
let end = 0;
let rules: TMathRules;
/** How many operators (and negations) the last sum read had at its level. */
let sumOps = 0;
/** The kind of the last factor read. */
let factorKind = KIND_BARE;
/** The last factor is a variable: a comma after it is a fallback written the wrong way. */
let factorVariable = 0;
/**
 * The factor is the first of its product: only there a number over a number is a fraction. Further on `/` divides:
 * `10*2/4` is `10px * 2 / 4`, not `10px * 50%` (CSS doesn't multiply a length by a percent).
 */
let factorFirst = 0;
/** How deep the reader is in brackets: a group, a function's arguments, a fallback. `0` — outside. */
let level = 0;
/** The value has an operator outside brackets. */
let bareOps = 0;

/**
 * Makes the readers of CSS values written as short text: math with units, variables, colours, gradients. The core knows
 * CSS and the mechanism; the spelling — the group's characters, the variable's, the function names, the gradient's
 * pieces — is the options, all of them required (lab D-044). A cold path: once per spelling; the options are checked
 * in development. The readers are a hot path: no closures and no regular expressions per call in math, the state in
 * module variables.
 *
 * Errors: `fail(message)` — the caller's error; by default a `TypeError`:
 * `[fundamentool/css] Value "1/0" is invalid for "bottom": a fraction can't have a zero total: "1/0"`.
 *
 * @param options - The spelling.
 * @returns The readers: `math`, `bare`, `variable`, `color`, `gradient`.
 * @throws {TypeError} In development: an unknown key (with the nearest valid one), a missing or invalid value, two
 *   places of the spelling with one character.
 * @example
 * const css = cssValuesProvider({
 *   group: ['(', ')'], variable: '$', env: '$$', nameEnd: ';',
 *   functions: { min: 'min', max: 'max', clamp: 'clamp' },
 *   gradient: { join: '-', stop: 'p', angle: '_g', radial: '_r', repeat: '_rpt', space: '_' },
 * });
 * const bottomRules = mathRules({ name: 'bottom', unit: 'px', units: ['px', 'rem', '%'] });
 * css.math('16+$$safe-area-inset-bottom(0)', bottomRules); // => 'calc(16px + env(safe-area-inset-bottom, 0px))'
 * css.variable('$mono(serif)');                            // => 'var(--mono, serif)'
 * css.color('$ink(F00)');                                  // => ['var(--ink, #f00)']
 * css.gradient('F00-00F_g90');                             // => ['linear-gradient(270deg,#f00 0%,#00f 100%)']
 */
export function cssValuesProvider(options: TCssValuesOptions): TCssValues {
  if (process.env.NODE_ENV !== 'production') {
    CSS_VALUES_OPTIONS().parse(options, WHERE);
  }
  const state = stateOf(options);

  /** A colour: a variable whole, or a code. */
  function color(v: string, alt?: boolean): string[] {
    current === state || load(state);
    const css = wholeVariable(v, colorFallback);
    return css ? [css] : colorCode(v, alt);
  }

  return Object.freeze({
    math: (expr: string, rulesValue: TMathRules): string => {
      current === state || load(state);
      return readValue(expr, rulesValue);
    },
    bare: (): number => bareOps,
    variable: (s: string, fallback?: (raw: string) => string): string | undefined => {
      current === state || load(state);
      return wholeVariable(s, fallback);
    },
    color,
    gradient: (input: string, alt?: boolean): string[] => gradientValue(
      state, color, input, alt,
    ),
  });
}

/** A provider's state from its options: a cold path. */
function stateOf(options: TCssValuesOptions): TState {
  const open = options.group[0];
  const close = options.group[1];
  const functions: Record<string, TFunction> = Object.create(null);
  const written = Object.keys(options.functions);
  let name: string;
  let arity: [number, number];
  for (name of written) {
    arity = CSS_FUNCTIONS[options.functions[name]];
    functions[name] = [
      options.functions[name],
      arity[0],
      arity[1],
    ];
  }
  const fail = options.fail || defaultFail;
  const gradient = options.gradient;
  const space = escapeRegExp(gradient.space);
  const stop = escapeRegExp(gradient.stop);
  return {
    open,
    close,
    variable: options.variable,
    env: options.env,
    envFirst: options.env[0],
    nameEnd: options.nameEnd,
    functions,
    functionNames: written.join(ARG_SEPARATOR),
    groupWord: GROUP_WORDS[open] || DOUBLE_QUOTE + open + close + DOUBLE_QUOTE,
    termStart: ': a value starts with a number ("10"), a variable ("' + options.variable + 'x"), '
      + (written.length ? 'a function ("' + written[0] + open + '…' + close + '") ' : '')
      + 'or a group ("' + open + '…' + close + '")',
    fail,
    legacy: options.legacy,
    join: gradient.join,
    repeat: new RegExp('^(.*)' + escapeRegExp(gradient.repeat) + '$', IGNORE_CASE),
    angle: new RegExp('^(.*)((' + escapeRegExp(gradient.radial) + ')' + space + '?([A-Za-z' + space + ']*)|'
      + escapeRegExp(gradient.angle) + '(-?[0-9]+))$', IGNORE_CASE),
    codeStop: new RegExp('^([A-Fa-f0-9]+(\\.[0-9]+)?)(' + stop + '([0-9]+)([a-z%]*))?$', IGNORE_CASE),
    // Sticky: read where the variable ends, without cutting the rest out.
    stop: new RegExp(stop + '([0-9]+)([a-z%]*)', IGNORE_CASE + 'y'),
    space: new RegExp(space + '+'),
  };
}

/** The default error: a `TypeError` with the module's prefix. */
function defaultFail(message: string): never {
  throw new TypeError(FAIL_PREFIX + message);
}

/** Copies a provider's spelling into the module's variables. */
function load(state: TState): void {
  current = state;
  OPEN = state.open;
  CLOSE = state.close;
  VARIABLE = state.variable;
  ENV = state.env;
  ENV_FIRST = state.envFirst;
  ENV_LENGTH = state.env.length;
  NAME_END = state.nameEnd;
  FUNCTIONS = state.functions;
}

/** The body of `math`: the CSS of the value; `bareOps` after it — whether an operator stood outside brackets. */
function readValue(expr: string, rulesValue: TMathRules): string {
  src = expr;
  pos = 0;
  end = expr.length;
  rules = rulesValue;
  level = 0;
  bareOps = 0;
  // The value is one group whole: its brackets group nothing — `(1+2)` → `calc(1px + 2px)`, `(10)` → `10px`.
  if (expr[0] === OPEN && groupEnd(expr) === end - 1) {
    const css = readValue(expr.slice(1, -1), rulesValue);
    bareOps = 0;
    return css;
  }
  // A whole value that is zero, with a unit or without — `0`, `-0`, `0px` — is written `0`.
  const minus = expr[0] === DASH;
  const zeroAt = minus ? 1 : 0;
  if (expr[zeroAt] === ZERO) {
    let i = zeroAt + 1;
    let ch: string;
    for (; i < end; i++) {
      ch = expr[i];
      if (!(ch >= LOWER_A && ch <= LOWER_Z || ch === PERCENT)) {
        break;
      }
    }
    if (i === end) {
      i > zeroAt + 1 && checkUnit(expr.slice(zeroAt + 1));
      return ZERO;
    }
  }
  end || invalid('a value is expected');
  minus && expr[1] !== DASH && !rules.negative && throwRule('negative value is not allowed for this property');
  const text = readSum();
  pos < end && unexpected();
  return sumOps ? CALC_OPEN + text + CLOSE_PAREN : text;
}

/** Where the group opened by the first character closes; `-1` — it isn't closed. */
function groupEnd(expr: string): number {
  const l = expr.length;
  let depth = 0;
  let i = 0;
  let ch: string;
  for (; i < l; i++) {
    ch = expr[i];
    if (ch === OPEN) {
      depth++;
    } else if (ch === CLOSE && !--depth) {
      return i;
    }
  }
  return -1;
}

/** A sum: products joined by `+` and `-`. A minus at the start is the first term's sign. */
function readSum(): string {
  let ops = 0;
  let text: string;
  let ch: string;
  if (src[pos] === DASH) {
    src[pos + 1] === DASH && legacy();
    pos++;
    ch = src[pos];
    text = readProduct(DASH);
    // A negative number is a number with a sign; anything else is negated by multiplying.
    ch >= ZERO && ch <= NINE || ch === DOT || (text += NEGATE, ops++);
  } else {
    text = readProduct('');
  }
  ops += factorKind;
  while (pos < end) {
    ch = src[pos];
    if (ch !== PLUS && ch !== DASH) {
      break;
    }
    pos++;
    level || (bareOps = 1);
    text += SPACE + ch + SPACE + readProduct('');
    ops++;
  }
  sumOps = ops;
  return text;
}

/**
 * A product: factors joined by `*` and `/`. A bare number is a length if nothing in the product has a unit (the first
 * of the bare ones), otherwise a number: `10*2` → `10px * 2`, `2*$gap` → `2 * var(--gap)`. After it `factorKind` is 1
 * if the product needs `calc` (operators or a group).
 */
function readProduct(sign: string): string {
  factorFirst = 1;
  const first = readFactor(sign);
  const firstKind = factorKind;
  let ch = src[pos];
  // One factor — most values: no lists.
  if (ch !== ASTERISK && ch !== SLASH) {
    factorKind = firstKind === KIND_DIMENSION && first[0] === OPEN_PAREN ? 1 : 0;
    return firstKind === KIND_BARE ? lengthText(first) : first;
  }
  const texts: string[] = [first];
  const kinds: number[] = [firstKind];
  const ops: string[] = [];
  let bare = firstKind === KIND_BARE ? 1 : 0;
  while (pos < end) {
    ch = src[pos];
    if (ch !== ASTERISK && ch !== SLASH) {
      break;
    }
    pos++;
    level || (bareOps = 1);
    ops.push(ch);
    factorFirst = 0;
    texts.push(readFactor(''));
    kinds.push(factorKind);
    factorKind === KIND_BARE || (bare = 0);
  }
  const l = texts.length;
  // `bare` — every factor is a bare number: the first is the length (`10*2` → `10px * 2`).
  let text = bare ? lengthText(first) : numberText(first, firstKind);
  let i = 1;
  for (; i < l; i++) {
    text += SPACE + ops[i - 1] + SPACE + numberText(texts[i], kinds[i]);
  }
  // Operators: `calc` is needed.
  factorKind = 1;
  return text;
}

/** A bare number as a length: `10` → `10px`, `0` → `0px` (inside math zero has a unit); plain numbers — as they are. */
function lengthText(raw: string): string {
  return rules.unit ? (raw[0] === DASH ? DASH + toFixed(raw.slice(1)) : toFixed(raw)) + rules.unit
    : numberText(raw, KIND_BARE);
}

/** A factor as it is; a bare number — not rounded: `1.125`, `.5`. */
function numberText(text: string, kind: number): string {
  if (kind === KIND_DIMENSION) {
    return text;
  }
  const v = '' + +text;
  return v[0] === ZERO && v[1] === DOT ? v.slice(1) : v[0] === DASH && v[1] === ZERO && v[2] === DOT
    ? DASH + v.slice(2) : v;
}

/** A factor: a number, a variable, a function or a group. */
function readFactor(sign: string): string {
  factorVariable = 0;
  const ch = src[pos];
  if (ch >= ZERO && ch <= NINE || ch === DOT) {
    return readNumber(sign);
  }
  const env = ch === ENV_FIRST && (ENV_LENGTH === 1 || src.startsWith(ENV, pos));
  if (env || ch === VARIABLE) {
    return readVariable(env);
  }
  if (ch === OPEN) {
    pos++;
    level++;
    const inner = readSum();
    level--;
    closeGroup();
    // The inner sum is its own: the factor's kind is set after it.
    factorKind = KIND_DIMENSION;
    return OPEN_PAREN + inner + CLOSE_PAREN;
  }
  if (ch >= UPPER_A && ch <= UPPER_Z || ch >= LOWER_A && ch <= LOWER_Z) {
    const text = readFunction();
    // The arguments are their own sums: the factor's kind is set after them.
    factorKind = KIND_DIMENSION;
    return text;
  }
  ch === DASH && src[pos + 1] === DASH && legacy();
  return pos < end ? unexpected() : invalid(DOUBLE_QUOTE + src[pos - 1] + '" needs a term after it');
}

/** A number and its unit; a number over a number — a fraction in percent. */
function readNumber(sign: string): string {
  const start = pos;
  let dots = 0;
  let ch: string;
  for (; pos < end; pos++) {
    ch = src[pos];
    if (ch === DOT) {
      dots++;
    } else if (ch < ZERO || ch > NINE) {
      break;
    }
  }
  const num = src.slice(start, pos);
  (dots > 1 || num === DOT) && invalid(DOUBLE_QUOTE + num + '" is not a number');
  const unitStart = pos;
  for (; pos < end; pos++) {
    ch = src[pos];
    if (!(ch >= LOWER_A && ch <= LOWER_Z || ch === PERCENT)) {
      break;
    }
  }
  const unit = src.slice(unitStart, pos);
  if (unit) {
    checkUnit(unit);
    factorKind = KIND_DIMENSION;
    return sign + toFixed(num) + unit;
  }
  ch = src[pos + 1];
  if (factorFirst && src[pos] === SLASH && (ch >= ZERO && ch <= NINE || ch === DOT)) {
    pos++;
    return sign + readFraction(num);
  }
  factorKind = KIND_BARE;
  return sign + num;
}

/** A fraction `1/3` → `33.33%`: the total is a number without a unit, not zero. */
function readFraction(num: string): string {
  const start = pos;
  let ch: string;
  for (; pos < end; pos++) {
    ch = src[pos];
    if (ch !== DOT && (ch < ZERO || ch > NINE)) {
      break;
    }
  }
  const total = src.slice(start, pos);
  ch = src[pos];
  (ch >= LOWER_A && ch <= LOWER_Z || ch === PERCENT) && invalid('a fraction is a number over a number: "' + num + SLASH
    + total + '" — the unit goes after the fraction is turned into a percent, so it isn\'t written');
  !+total && invalid('a fraction can\'t have a zero total: "' + num + SLASH + total + DOUBLE_QUOTE);
  checkUnit(PERCENT);
  factorKind = KIND_DIMENSION;
  return toFixed(100 * +num / +total) + PERCENT;
}

/**
 * The property's unit: a percent has its own message. A unit it doesn't take — with an example: a short list of units
 * whole, a long one — the bare number's unit (`10px`), no units — a plain number.
 */
function checkUnit(unit: string): void {
  const units = rules.units;
  const count = units.length;
  units.indexOf(unit) < 0 && (unit === PERCENT
    ? throwRule('this property takes a length, percent is not allowed')
    : invalid('unit "' + unit + '" doesn\'t fit' + (!count ? ': the value is a plain number, as "1.5"'
      : count > UNITS_LISTED ? ', as "10' + rules.unit + DOUBLE_QUOTE : ': the units are ' + units.join(ARG_SEPARATOR))));
}

/** A variable `$name` → `var(--name)`, `$$name` → `env(name)`; its fallback in a group: `$a(10)`. */
function readVariable(env: boolean): string {
  pos += env ? ENV_LENGTH : 1;
  const name = readName();
  name || invalid('a variable needs a name after "' + (env ? ENV : VARIABLE) + '": "' + VARIABLE + 'gap", "' + ENV
    + 'safe-area-inset-top"');
  src[pos] === NAME_END && pos++;
  let fallback = '';
  if (src[pos] === OPEN) {
    pos++;
    level++;
    fallback = readSum();
    level--;
    fallback = ARG_SEPARATOR + (sumOps ? CALC_OPEN + fallback + CLOSE_PAREN : fallback);
    closeGroup();
  }
  factorVariable = 1;
  factorKind = KIND_DIMENSION;
  return (env ? ENV_OPEN : VAR_OPEN) + name + fallback + CLOSE_PAREN;
}

/** A variable's name: letters, digits, `-`, `_`, non-ASCII. It ends at any character a CSS name doesn't have. */
function readName(): string {
  const start = pos;
  let ch: string;
  for (; pos < end; pos++) {
    ch = src[pos];
    if (!(ch >= LOWER_A && ch <= LOWER_Z || ch >= UPPER_A && ch <= UPPER_Z || ch >= ZERO && ch <= NINE || ch === DASH
      || ch === '_' || ch >= '\u0080')) {
      break;
    }
  }
  return src.slice(start, pos);
}

/** A function `min(a,b)` → `min(a, b)`: a name of the spelling, its arguments joined by `,`, as many as it takes. */
function readFunction(): string {
  const start = pos;
  let ch: string;
  for (pos++; pos < end; pos++) {
    ch = src[pos];
    if (ch < LOWER_A || ch > LOWER_Z) {
      break;
    }
  }
  const name = src.slice(start, pos);
  const fn = FUNCTIONS[name];
  const spell = current as TState;
  if (!fn) {
    name.toLowerCase() === 'calc' && invalid('a sum is written without "' + name + '": "100%-2rem", a group in '
      + spell.groupWord + ' — "' + OPEN + '100%-2rem' + CLOSE + '/3"');
    // Without a group it is no call, but a letter out of place: `bF00` — a colour in a length, not a function "F".
    if (src[pos] !== OPEN) {
      pos = start;
      unexpected();
    }
    invalid('unknown function "' + name + '". Functions: ' + spell.functionNames);
  }
  src[pos] === OPEN || invalid('the arguments of "' + name + '" are written in ' + spell.groupWord + ': "' + name + OPEN
    + '100%,50rem' + CLOSE + DOUBLE_QUOTE);
  pos++;
  level++;
  const args: string[] = [];
  for (;;) {
    args.push(readSum());
    ch = src[pos];
    if (ch !== COMMA) {
      break;
    }
    pos++;
  }
  level--;
  closeGroup();
  (args.length < fn[1] || args.length > fn[2]) && invalid(DOUBLE_QUOTE + name + '" takes ' + (fn[1] === fn[2]
    ? fn[1] : 'at least ' + fn[1]) + ' arguments, got ' + args.length);
  return fn[0] + OPEN_PAREN + args.join(ARG_SEPARATOR) + CLOSE_PAREN;
}

/** The close of a group, a function or a fallback. */
function closeGroup(): void {
  src[pos] === CLOSE ? pos++ : pos < end ? unexpected() : invalid(DOUBLE_QUOTE + OPEN + '" is not closed');
}

/** A character that can't stand here. */
function unexpected(): never {
  const ch = src[pos];
  return invalid(ch === COMMA && factorVariable
    ? 'a fallback is written in ' + (current as TState).groupWord + ': "' + src.slice(0, pos) + OPEN + src.slice(pos + 1)
      + CLOSE + DOUBLE_QUOTE
    : DOUBLE_QUOTE + ch + DOUBLE_QUOTE + (pos ? ' after "' + src.slice(0, pos) + DOUBLE_QUOTE + MSG_NOT_EXPECTED
      : MSG_NOT_EXPECTED + (current as TState).termStart));
}

/** The preset's hook where a term starts with `--`. */
function legacy(): void {
  const hook = (current as TState).legacy;
  hook && hook(src);
}

function invalid(reason: string): never {
  return fail('Value "' + src + '" is invalid for "' + rules.name + '": ' + reason);
}

function throwRule(reason: string): never {
  return fail('Value "' + src + '" is invalid: ' + reason);
}

/** The caller's error; if its `fail` returns, the default one. */
function fail(message: string): never {
  (current as TState).fail(message);
  return defaultFail(message);
}

/** The body of `variable`: the CSS of a whole variable, or `undefined`. */
function wholeVariable(s: string, fallback?: (raw: string) => string): string | undefined {
  const first = s[0];
  const env = first === ENV_FIRST && (ENV_LENGTH === 1 || s.startsWith(ENV));
  if (!env && first !== VARIABLE) {
    if (first === DASH && s[1] === DASH) {
      const hook = (current as TState).legacy;
      hook && hook(s);
    }
    return;
  }
  src = s;
  end = s.length;
  pos = env ? ENV_LENGTH : 1;
  const name = readName();
  if (!name) {
    return;
  }
  pos < end && s[pos] === NAME_END && pos++;
  if (pos === end) {
    return (env ? ENV_OPEN : VAR_OPEN) + name + CLOSE_PAREN;
  }
  if (s[pos] !== OPEN || s[end - 1] !== CLOSE) {
    return;
  }
  const raw = s.slice(pos + 1, -1);
  return (env ? ENV_OPEN : VAR_OPEN) + name + ARG_SEPARATOR + (wholeVariable(raw, fallback) || (fallback ? fallback(raw)
    : raw)) + CLOSE_PAREN;
}

/** A colour variable's fallback: a code as a colour (`F00` → `#f00`), a word as it is. */
function colorFallback(raw: string): string {
  return colorCode(raw)[0];
}

/** The body of `gradient`: a colour's variants, or one gradient (with `alt` and an alpha — without it first). */
function gradientValue(
  state: TState, color: (v: string, alt?: boolean) => string[], input: string, alt?: boolean,
): string[] {
  let v = input;
  let matches: RegExpExecArray | null;
  let repeating = 0;
  let radial = '';
  let angle = 180;
  matches = state.repeat.exec(v);
  if (matches) {
    repeating = 1;
    v = matches[1];
  }
  matches = state.angle.exec(v);
  if (matches) {
    v = matches[1];
    if (matches[3]) {
      radial = camelToKebabCase(lowerFirst(matches[4] || CIRCLE)).split(state.space).join(SPACE);
    } else {
      angle = (angle + parseInt(matches[5], 10)) % 360;
      angle < 0 && (angle += 360);
    }
  }
  const colors: string[][] = [];
  const stops: string[] = [];
  readStops(
    state, color, v, colors, stops, input, alt,
  );
  const l = colors.length;
  if (l < 2) {
    return l ? colors[0] : [];
  }
  const last = l - 1;
  const prefix = (repeating ? 'repeating-' : '') + (radial ? 'radial' : 'linear') + '-gradient('
    + (radial || angle + 'deg');
  const plain: string[] = [prefix];
  const withAlpha: string[] = [prefix];
  let hasAlpha = 0;
  let i = 0;
  let stop: string;
  let alts: string[];
  for (; i < l; i++) {
    stop = SPACE + (stops[i] || Math.round(i * 100 / last) + PERCENT);
    alts = colors[i];
    plain.push(alts[0] + stop);
    withAlpha.push((alts[1] ? (hasAlpha = 1, alts[1]) : alts[0]) + stop);
  }
  const gradient = plain.join(COMMA) + CLOSE_PAREN;
  if (!alt) {
    return [gradient];
  }
  const result = colors[0].concat(gradient);
  hasAlpha && result.push(withAlpha.join(COMMA) + CLOSE_PAREN);
  return result;
}

/**
 * A gradient's colours and their stops. A variable runs to the end of its name, its fallback group and the name's end;
 * a code — to the join or a variable. A colour that can't be read goes on as written: the caller's check rejects it.
 */
function readStops(
  state: TState, color: (v: string, alt?: boolean) => string[], v: string, colors: string[][], stops: string[],
  input: string, alt?: boolean,
): void {
  const end = v.length;
  const join = state.join;
  const variable = state.variable;
  const env = state.env;
  const envFirst = state.envFirst;
  const open = state.open;
  const close = state.close;
  const nameEnd = state.nameEnd;
  const stopAfter = state.stop;
  let pos = 0;
  let start: number;
  let item: string;
  let depth: number;
  let envHere: boolean;
  let m: RegExpExecArray | null;
  let ch: string;
  while (pos < end) {
    ch = v[pos];
    if (ch === DASH && v[pos + 1] === DASH && state.legacy) {
      state.legacy(input);
    }
    if (ch === join) {
      pos++;
      continue;
    }
    start = pos;
    envHere = ch === envFirst && v.startsWith(env, pos);
    if (envHere || ch === variable) {
      pos += envHere ? env.length : 1;
      for (; pos < end; pos++) {
        ch = v[pos];
        if (!(ch >= LOWER_A && ch <= LOWER_Z || ch >= UPPER_A && ch <= UPPER_Z || ch >= ZERO && ch <= NINE || ch === DASH
          || ch === '_' || ch >= '\u0080')) {
          break;
        }
      }
      if (v[pos] === open) {
        for (depth = 0; pos < end; pos++) {
          ch = v[pos];
          ch === open ? depth++ : ch === close && depth--;
          if (!depth) {
            pos++;
            break;
          }
        }
      }
      item = v.slice(start, pos);
      v[pos] === nameEnd && pos++;
      colors.push(color(item));
      stopAfter.lastIndex = pos;
      m = stopAfter.exec(v);
      m && (pos = stopAfter.lastIndex);
      stops.push(m ? m[1] + (m[2] || PERCENT) : '');
    } else {
      while (pos < end && (ch = v[pos]) !== join && ch !== variable && ch !== envFirst) {
        pos++;
      }
      item = v.slice(start, pos);
      m = state.codeStop.exec(item);
      colors.push(colorCode(m ? m[1] : item, alt));
      stops.push(m && m[4] ? m[4] + (m[5] || PERCENT) : '');
    }
  }
}
