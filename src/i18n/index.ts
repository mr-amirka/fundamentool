// Localization (fundamentool D-060 – D-066; the design card: LABARATORY/PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/SPEC/
// i18n.md). One locale per app (`createLocale`), a set of messages per package (`createMessages`), read by key —
// `t(K.hud.moves, { count })`, the key always a constant (D-066). A locale's texts reach the runtime in one compact
// format (D-065): the keys once, a locale's values by position — made by the Vite plugin (`fundamentool/i18n/vite`) or
// in memory by `sourceOf` (tests, Node).
import {
  createObservable,
} from '../Observable';
import type {
  Observable,
} from '../Observable';
import {
  templateProvider,
} from '../templateProvider';
import {
  describeValue,
} from '../describeValue';
import {
  array,
  func,
  lazy,
  object,
  record,
  string,
  unknown,
} from '../schema';

// ——— Types ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** A set's base messages, nested: a text, a list of texts (variants, §5.7), or a group. Written `as const`. */
export type TMessages = { readonly [key: string]: string | readonly string[] | TMessages };

/** A translation of a base: the same tree, every text a string (any length of a list). */
export type TTranslation<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends readonly string[] ? readonly string[] :
    TTranslation<T[K]>;
};

/** The keys' tree of the compact format: a leaf is its name, a group is `[name, children]`. */
export type TKeyTree = readonly (string | readonly [string, TKeyTree])[];

/** A locale's values in the keys' order: a text, a list, or `null` — not translated (the base's is shown). */
export type TValues = readonly (string | readonly string[] | null)[];

/** A locale's values as a chunk: the hash says which keys' order they follow. */
export type TLocaleValues = { hash: string;
  values: TValues };

/** What the runtime reads (D-065): every set's keys, the inline locales' values, a loader for the rest. */
export type TLexiconSource = {
  /** The hash of the keys' order — a loaded locale with another hash belongs to another build. */
  hash: string;
  /** `[setName, its keys' tree]` for every set, in the values' order. */
  keys: readonly (readonly [string, TKeyTree])[];
  /** The values of the locales in the bundle (`inline`); the base always. */
  values: Readonly<Record<string, TValues>>;
  /** Fetches a locale not in the bundle; absent when every locale is inline. */
  load?: (locale: string) => Promise<TLocaleValues>;
};

declare const MESSAGE_KEY: unique symbol;

/** A message key — a constant of its set (D-066): the brand makes a bare string fail to compile. */
export type TMessageKey<T, P extends string = string> = P & { readonly [MESSAGE_KEY]: T };

type TJoin<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

/** Every path of a text (not a list) in a base: `'hud.moves' | 'menu.play' | …`. */
export type TTextPath<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? TJoin<P, K> : T[K] extends readonly string[] ? never :
    TTextPath<T[K], TJoin<P, K>>;
}[keyof T & string];

/** Every path of a list in a base. */
export type TListPath<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends readonly string[] ? TJoin<P, K> :
    TListPath<T[K], TJoin<P, K>>;
}[keyof T & string];

type TAt<T, P extends string> = P extends `${infer H}.${infer R}` ? H extends keyof T ? TAt<T[H], R> : never :
  P extends keyof T ? T[P] : never;

type TTrim<S extends string> = S extends ` ${infer R}` ? TTrim<R> : S extends `${infer R} ` ? TTrim<R> : S;

/** The names of a template's variables: `'{{count|one:# move|other:# moves}} in {{level}}'` → `'count' | 'level'`. */
export type TVarNames<S> = S extends `${string}{{${infer E}}}${infer R}` ?
  (E extends `${infer N}|${string}` ? TTrim<N> : TTrim<E>) | TVarNames<R> : never;

/** A value of a variable (D-062): converted where the message needs it — a number from `'3'`, a date from ms. */
export type TVarValue = string | number | Date;

/** The rest of `t`'s arguments for a key: none for a text without variables; its variables, each named, otherwise. */
export type TArgs<T, K> = [TVarNames<TAt<T, TPathOf<T, K>>>] extends [never] ? [vars?: Record<string, never>] :
  [vars: Record<TVarNames<TAt<T, TPathOf<T, K>>>, TVarValue>];

type TPathOf<T, K> = { [P in TTextPath<T>]: K extends P ? P : never }[TTextPath<T>];

/** The key constants of a base: the same tree, every leaf its path, branded (D-066). */
export type TKeys<R, T = R, P extends string = ''> = {
  readonly [K in keyof T & string]: T[K] extends string | readonly string[] ? TMessageKey<R, TJoin<P, K>> :
    TKeys<R, T[K], TJoin<P, K>>;
};

/** A text key of a set. */
export type TTextKey<T> = TMessageKey<T, TTextPath<T>>;

/** A key and its variables as data — passed to a child that calls `t(...message)` (D-064). */
export type TMessage<T> = { [P in TTextPath<T>]: [TVarNames<TAt<T, P>>] extends [never] ?
  readonly [key: TMessageKey<T, P>] : readonly [key: TMessageKey<T, P>, vars: Record<TVarNames<TAt<T, P>>, TVarValue>] }[
  TTextPath<T>];

/** A segment of a message with tags (§5.6): its text and the tag around it, if any. */
export type TPart = { text: string;
  tag?: string };

/** A compiled message: variables in, text out; with tags — `parts` too. */
type TCompiled = ((vars: Record<string, unknown> | undefined) => string) & {
  parts?: (vars: Record<string, unknown> | undefined) => TPart[];
};

type TCompiledValue = TCompiled | readonly TCompiled[] | undefined;

/** Options of `createLocale`. */
export type TLocaleOptions<L extends string> = {
  /** The texts: `virtual:lexicons` (the plugin) or `sourceOf(…)`. */
  source: TLexiconSource;
  /** The app's locales; the first is the base — always in the bundle, the fallback of a missing text. */
  locales: readonly L[];
  /** Other language tags → a locale of the list (`{ ua: 'uk' }`); merged over the built-in ones (`pt` → `pt-BR`…). */
  aliases?: Readonly<Record<string, L>>;
};

/** The app's locale. */
export type TLocale<L extends string = string> = {
  /** The current locale — always one whose texts are there. */
  $locale: Observable<L>;
  /** Makes a locale current once its texts are there; `false` — a later `select` won, the load failed, or not a locale. */
  select(locale: L): Promise<boolean>;
  /** Settles when the last `select` did; never rejects. */
  ready(): Promise<void>;
  /** Fetches a locale's texts without switching to it (a preload); `true` — they are there. */
  load(locale: L): Promise<boolean>;
  /** The first candidate that is (or is an alias of) one of the locales; the base if none. `undefined` skipped. */
  detect(candidates: readonly (string | null | undefined)[]): L;
  /** A guard for a stored value. */
  isLocale(value: unknown): value is L;
  /** The current locale's entry of a record of translations; else the base's; else `''`. */
  pick(record: Readonly<Partial<Record<string, string>>>): string;
  /** The locales, in the app's order; `locales[0]` is the base. */
  readonly locales: readonly L[];
  /** @internal The set's slice of the source: its keys' tree and the position of its first value. */
  readonly _set: (name: string) => readonly [tree: TKeyTree, offset: number] | undefined;
  /** @internal A locale's values, if they are there. */
  readonly _values: (locale: string) => TValues | undefined;
};

/** A set of messages (`createMessages`). */
export type TMessagesSet<T, L extends string = string> = {
  /** The key constants (D-066): `text.keys.hud.moves` — the one way to name a message. */
  readonly keys: TKeys<T>;
  /** A text in the current locale. */
  t<K extends TTextKey<T>>(key: K, ...args: TArgs<T, K>): string;
  /** A text in a given locale — its texts must be there (`select` or inline); else the base's. */
  translate<K extends TTextKey<T>>(locale: L, key: K, ...args: TArgs<T, K>): string;
  /** A text with tags as segments (§5.6) — values never parsed as tags. */
  parts<K extends TTextKey<T>>(key: K, ...args: TArgs<T, K>): TPart[];
  /** A list's texts in the current locale (§5.7). */
  list(key: TMessageKey<T, TListPath<T>>): string[];
  /** Is a string — a key from a server, say — a text key of this set. */
  has(key: string): key is TTextKey<T>;
  /** Formatting in the current locale, the formatters cached per locale. */
  readonly format: TFormat;
  /** Fetches a locale's texts without switching to it (the locale's `load`). */
  load(locale: L): Promise<boolean>;
  /** The locale the set follows. */
  readonly locale: TLocale<L>;
  /** @internal A text or its parts in a given locale (the view bindings). */
  readonly _text: (locale: string, key: string, vars: Record<string, unknown> | undefined, asParts: boolean) =>
    string | TPart[];
  /** @internal `translate` bound to a locale — one function per locale (`useT` keeps its identity). */
  readonly _bound: (locale: string) => TMessagesSet<T, L>['t'];
};

/** Formatting by `Intl` in the current locale. */
export type TFormat = {
  number(value: number | string, options?: Intl.NumberFormatOptions): string;
  currency(value: number | string, currency: string): string;
  percent(value: number | string): string;
  date(value: TVarValue, style?: 'short' | 'medium' | 'long' | 'full'): string;
  /** The time if `value` is today, the date and the time otherwise. */
  clock(value: TVarValue, now?: number): string;
  /** "3 minutes ago", "in 2 days". */
  relative(value: TVarValue, now?: number): string;
  list(values: readonly (string | number)[]): string;
};

// ——— Constants ———————————————————————————————————————————————————————————————————————————————————————————————————

const WHERE_LOCALE = 'createLocale';
const DECIMAL = 'decimal';
const PERCENT = 'percent';
const CURRENCY = 'currency';
const WHERE_MESSAGES = 'createMessages';
const DOT = '.';
const PLURAL_CATEGORIES = new Set([
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
]);
const NUMBER_PLACEHOLDER = /#/g;
const TAGS = /<([a-z][\w-]*)>([\s\S]*?)<\/\1>/gi;
const TAG_MARKS = /<\/?[a-z][\w-]*>/gi;
/** First Strong Isolate / Pop Directional Isolate: a value keeps its own direction inside right-to-left text. */
const FSI = '⁨';
const PDI = '⁩';
const RTL = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'yi',
  'dv',
  'ckb',
  'sd',
  'ug',
]);
/** Old or alternative language subtags → the usual locale. */
const ALIASES: Readonly<Record<string, string>> = {
  pt: 'pt-BR',
  nb: 'no',
  nn: 'no',
  iw: 'he',
  in: 'id',
  ji: 'yi',
};
const HANT_REGIONS = new Set([
  'tw',
  'hk',
  'mo',
]);
const TWO_DIGITS = '2-digit';
const DAY_MS = 86_400_000;
const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  [
    'year',
    365 * DAY_MS,
  ],
  [
    'month',
    30 * DAY_MS,
  ],
  [
    'week',
    7 * DAY_MS,
  ],
  [
    'day',
    DAY_MS,
  ],
  [
    'hour',
    3_600_000,
  ],
  [
    'minute',
    60_000,
  ],
  [
    'second',
    1000,
  ],
];

const LOCALE_OPTIONS = /*#__PURE__*/ lazy(() => object({
  source: object({
    hash: string(),
    keys: array(unknown()),
    values: record(unknown()),
    load: func().optional(),
  }).passthrough(),
  locales: array(string()),
  aliases: record(string()).optional(),
}));

// ——— Messages: values, conversion, compilation ——————————————————————————————————————————————————————————————————

/** Problems already reported in production — one warning per message and variable. */
const warned = new Set<string>();

/**
 * A value that can't be shown as the message needs (D-062): an error in development — the page or the test fails at
 * once; in production the value as it is, and one warning.
 */
function complain(text: string, shown: string): string {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    throw new TypeError('[i18n] ' + text);
  }
  if (!warned.has(text)) {
    warned.add(text);
    console.warn('[i18n] ' + text);
  }
  return shown;
}

/** A number from a number or a numeric string; `NaN` when it isn't one. */
function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return NaN;
}

/** A date from a `Date`, ms since epoch (a number or a numeric string) or an ISO string; an invalid date otherwise. */
function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  const ms = toNumber(value);
  return new Date(isFinite(ms) ? ms : typeof value === 'string' ? value : NaN);
}

/** Formatters per locale and kind, made once each. */
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat |
  Intl.ListFormat | Intl.PluralRules>();

function cached<F>(key: string, make: () => F): F {
  let formatter = formatters.get(key) as F | undefined;
  if (!formatter) {
    formatter = make();
    formatters.set(key, formatter as never);
  }
  return formatter;
}

function numberFormat(
  locale: string, style: string, arg?: string,
): Intl.NumberFormat {
  return cached(`${locale}|n|${style}|${arg || ''}`, () => new Intl.NumberFormat(locale, style === CURRENCY ?
    {
      style: CURRENCY,
      currency: arg,
    } : style === PERCENT ? {
      style: PERCENT,
    } : undefined));
}

function dateFormat(locale: string, kind: string): Intl.DateTimeFormat {
  return cached(`${locale}|d|${kind}`, () => new Intl.DateTimeFormat(locale, kind === 'time' ?
    {
      hour: TWO_DIGITS,
      minute: TWO_DIGITS,
    } : kind === 'day-time' ?
      {
        day: 'numeric',
        month: 'short',
        hour: TWO_DIGITS,
        minute: TWO_DIGITS,
      } :
      {
        dateStyle: kind as Intl.DateTimeFormatOptions['dateStyle'],
      }));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function clockOf(
  locale: string, date: Date, now: number,
): string {
  return dateFormat(locale, sameDay(date, new Date(now)) ? 'time' : 'day-time').format(date);
}

function relativeOf(
  locale: string, date: Date, now: number,
): string {
  const diff = date.getTime() - now;
  const format = cached(`${locale}|r`, () => new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
  }));
  const distance = Math.abs(diff);
  // The largest unit the distance reaches; under a second — seconds ("now")
  const [
    unit,
    size,
  ] = RELATIVE_UNITS.find(([, length]) => distance >= length) ?? RELATIVE_UNITS[RELATIVE_UNITS.length - 1];
  return format.format(Math.round(diff / size), unit);
}

/** One `{{…}}` of a message, compiled for a locale: variables in, the piece of text out. */
type TPiece = (vars: Record<string, unknown> | undefined) => string;

/**
 * Compiles one `{{…}}` for a locale (research 03 §5.3, §5.4): `{{name}}`; a plural `{{n|one:# coin|other:# coins}}`
 * (`#` — the number, formatted); `|number`, `|percent`, `|currency:USD`, `|date[:short…]`, `|clock`, `|relative`,
 * `|list`, `|t` (the value is a key of the set). A value is converted as the place needs (D-062).
 */
function expressionParser(
  locale: string, at: string, lookup: (key: string, vars: undefined) => string | undefined,
):
(expression: string) => TPiece {
  const rtl = isRtl(locale);
  const isolate = (text: string): string => (rtl ? FSI + text + PDI : text);
  return (expression) => {
    const bar = expression.indexOf('|');
    const bare = bar < 0;
    const name = (bare ? expression : expression.slice(0, bar)).trim();
    const rest = bare ? '' : expression.slice(bar + 1);
    const colon = rest.indexOf(':');
    const noArg = colon < 0;
    const head = (noArg ? rest : rest.slice(0, colon)).trim();
    const arg = noArg ? '' : rest.slice(colon + 1).trim();
    const missing = `${at}: "${name}" isn't passed`;
    const wrong = (expected: string, value: unknown): string => complain(`${at}: "${name}" expects ${expected}, got ${describeValue(value)}`, isolate(String(value)));

    if (!rest) {
      return (vars) => {
        const value = vars?.[name];
        if (typeof value === 'string' || typeof value === 'number') {
          return isolate(String(value));
        }
        return value === undefined || value === null ? complain(missing, '') : wrong('a string or a number', value);
      };
    }

    if (colon >= 0 && PLURAL_CATEGORIES.has(head)) {
      const forms: Record<string, string> = {};
      const options = rest.split('|');
      const optionsLength = options.length;
      let option: string;
      let at2: number;
      for (let i = 0; i < optionsLength; i++) {
        option = options[i];
        at2 = option.indexOf(':');
        forms[option.slice(0, at2).trim()] = option.slice(at2 + 1);
      }
      const rules = cached(`${locale}|p`, () => new Intl.PluralRules(locale));
      return (vars) => {
        const value = vars?.[name];
        if (value === undefined || value === null) {
          return complain(missing, '');
        }
        const count = toNumber(value);
        if (!isFinite(count)) {
          return wrong('a number', value);
        }
        const form = forms[rules.select(count)] ?? forms.other ?? '';
        return form.replace(NUMBER_PLACEHOLDER, isolate(numberFormat(locale, DECIMAL).format(count)));
      };
    }

    const numeric = (style: string, currency?: string): TPiece => (vars) => {
      const value = vars?.[name];
      if (value === undefined || value === null) {
        return complain(missing, '');
      }
      const count = toNumber(value);
      return isFinite(count) ? isolate(numberFormat(
        locale, style, currency,
      ).format(count)) : wrong('a number', value);
    };
    const dated = (show: (date: Date) => string): TPiece => (vars) => {
      const value = vars?.[name];
      if (value === undefined || value === null) {
        return complain(missing, '');
      }
      const date = toDate(value);
      return isNaN(date.getTime()) ? wrong('a date (a Date, ms or an ISO string)', value) : isolate(show(date));
    };

    switch (head) {
      case 'number':
        return numeric(DECIMAL);
      case PERCENT:
        return numeric(PERCENT);
      case CURRENCY:
        return numeric(CURRENCY, arg || 'USD');
      case 'date':
        return dated((date) => dateFormat(locale, arg || 'medium').format(date));
      case 'clock':
        return dated((date) => clockOf(
          locale, date, Date.now(),
        ));
      case 'relative':
        return dated((date) => relativeOf(
          locale, date, Date.now(),
        ));
      case 'list':
        return (vars) => {
          const value = vars?.[name];
          if (value === undefined || value === null) {
            return complain(missing, '');
          }
          const items = Array.isArray(value) ? value.map(String) : [String(value)];
          return isolate(cached(`${locale}|l`, () => new Intl.ListFormat(locale)).format(items));
        };
      case 't':
        return (vars) => {
          const value = vars?.[name];
          if (value === undefined || value === null) {
            return complain(missing, '');
          }
          const text = lookup(String(value), undefined);
          return text === undefined ? wrong('a key of the set', value) : isolate(text);
        };
      default:
        return () => complain(`${at}: unknown format "|${head}"`, '');
    }
  };
}

/**
 * Compiles one template for a locale (the message-maps convention: once, when the locale's texts are compiled — never
 * inside `t`). A template with tags (`Tap <b>{{name}}</b>`) also gets `parts`; `t` returns its text without the tags.
 */
function compileTemplate(template: string, parse: (expression: string) => TPiece): TCompiled {
  const plain = templateProvider(template.replace(TAG_MARKS, ''), parse) as TCompiled;
  if (template.indexOf('<') < 0) {
    return plain;
  }
  const segments: (readonly [TPiece, string | undefined])[] = [];
  let start = 0;
  template.replace(TAGS, (
    whole, tag: string, inner: string, offset: number,
  ) => {
    if (offset > start) {
      segments.push([
        templateProvider(template.slice(start, offset), parse) as TPiece,
        undefined,
      ]);
    }
    segments.push([
      templateProvider(inner, parse) as TPiece,
      tag.toLowerCase(),
    ]);
    start = offset + whole.length;
    return '';
  });
  if (start < template.length) {
    segments.push([
      templateProvider(template.slice(start), parse) as TPiece,
      undefined,
    ]);
  }
  plain.parts = (vars) => segments.map(([
    piece,
    tag,
  ]) => (tag ? {
    text: piece(vars),
    tag,
  } : {
    text: piece(vars),
  }));
  return plain;
}

/**
 * Compiles a locale's messages once (the message-maps pattern): each template parsed here, a call only substitutes.
 *
 * @param messages - key → template (`{{name}}`, plurals, formats — research 03 §5.4).
 * @param locale - the BCP 47 tag the plurals and formats follow.
 * @returns key → compiled message.
 *
 * @example
 * const m = compileMessages({ coins: '{{n|one:# coin|other:# coins}}' }, 'en');
 * m.coins({ n: 1 });     // '1 coin'
 * m.coins({ n: 12345 }); // '12,345 coins'
 */
export function compileMessages<K extends string>(messages: Readonly<Record<K, string>>, locale: string):
Record<K, (vars?: Record<string, unknown>) => string> {
  const compiled = {} as Record<K, (vars?: Record<string, unknown>) => string>;
  const lookup = (key: string): string | undefined => compiled[key as K]?.();
  for (const key of Object.keys(messages) as K[]) {
    compiled[key] = compileTemplate(messages[key], expressionParser(
      locale, key, lookup,
    ));
  }
  return compiled;
}

/**
 * Is a locale written right to left (`ar`, `he`, `fa`, `ur` …; the region and script are ignored).
 *
 * @example
 * isRtl('ar-EG'); // true
 * isRtl('en');    // false
 */
export function isRtl(locale: string): boolean {
  return RTL.has(locale.split('-')[0].toLowerCase());
}

// ——— The source: the compact format ——————————————————————————————————————————————————————————————————————————————

/** The keys' tree of a base and its values in the same order. */
function flatten(
  messages: TMessages, tree: (string | readonly [string, TKeyTree])[], values: TValues[number][],
): void {
  for (const name of Object.keys(messages)) {
    const value = messages[name];
    if (typeof value === 'string' || Array.isArray(value)) {
      tree.push(name);
      values.push(value as string | readonly string[]);
    } else {
      const children: (string | readonly [string, TKeyTree])[] = [];
      tree.push([
        name,
        children,
      ]);
      flatten(
        value as TMessages, children, values,
      );
    }
  }
}

/** A translation's values in the order of a base's keys' tree; `null` where it has no text. */
function valuesOf(
  tree: TKeyTree, messages: TMessages | undefined, out: TValues[number][],
): void {
  for (const node of tree) {
    if (typeof node === 'string') {
      const value = messages?.[node];
      out.push(typeof value === 'string' || Array.isArray(value) ? value as string | readonly string[] : null);
    } else {
      valuesOf(
        node[1], messages?.[node[0]] as TMessages | undefined, out,
      );
    }
  }
}

/** A short hash of the keys' order (FNV-1a) — two builds with the same keys get the same one. */
export function hashKeys(keys: TLexiconSource['keys']): string {
  const text = JSON.stringify(keys);
  const length = text.length;
  let hash = 0x811c9dc5;
  for (let i = 0; i < length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The compact source (D-065) built in memory from TypeScript messages — what the Vite plugin makes at build time; for
 * tests, Node and apps built without Vite. Every locale is inline.
 *
 * @param sets - set name → `{ [locale]: messages }`; the base locale's messages give the keys.
 * @param base - the base locale (the first of the app's `locales`).
 *
 * @example
 * const source = sourceOf({ game: { en, ru } }, 'en');
 * const locale = createLocale({ source, locales: ['en', 'ru'] });
 */
export function sourceOf(sets: Readonly<Record<string, Readonly<Record<string, TMessages>>>>, base: string):
TLexiconSource {
  const keys: (readonly [string, TKeyTree])[] = [];
  const baseValues: TValues[number][] = [];
  for (const name of Object.keys(sets)) {
    const tree: (string | readonly [string, TKeyTree])[] = [];
    flatten(
      sets[name][base] ?? {}, tree, baseValues,
    );
    keys.push([
      name,
      tree,
    ]);
  }
  const locales = new Set<string>();
  for (const name of Object.keys(sets)) {
    for (const locale of Object.keys(sets[name])) {
      locales.add(locale);
    }
  }
  const values: Record<string, TValues> = {
    [base]: baseValues,
  };
  for (const locale of locales) {
    if (locale !== base) {
      const out: TValues[number][] = [];
      for (const [
        name,
        tree,
      ] of keys) {
        valuesOf(
          tree, sets[name][locale], out,
        );
      }
      values[locale] = out;
    }
  }
  return {
    hash: hashKeys(keys),
    keys,
    values,
  };
}

// ——— The locale ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The app's locale (D-060, D-061): the current one as an `Observable`, switching (the last choice wins), detection.
 *
 * @example
 * import source from 'virtual:lexicons';
 * const locale = createLocale({ source, locales: ['en', 'ru', 'de'] });
 * await locale.select(locale.detect([saved, ...navigator.languages]));
 * locale.$locale.getState(); // 'de'
 */
export function createLocale<const L extends string>(options: TLocaleOptions<L>): TLocale<L> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    LOCALE_OPTIONS().parse(options, WHERE_LOCALE);
    if (!options.locales.length || !options.source.values[options.locales[0]]) {
      throw new TypeError(`${WHERE_LOCALE}: the base locale "${options.locales[0]}" has no texts in the source`);
    }
  }
  const {
    source,
    locales,
  } = options;
  const base = locales[0];
  const aliases: Record<string, string> = {
    ...ALIASES,
    ...options.aliases,
  };
  const values: Record<string, TValues> = {
    ...source.values,
  };
  const loading: Record<string, Promise<boolean>> = {};
  const $locale = createObservable<L>(base);
  const sets = new Map<string, readonly [TKeyTree, number]>();
  let offset = 0;
  for (const [
    name,
    tree,
  ] of source.keys) {
    sets.set(name, [
      tree,
      offset,
    ]);
    offset += countLeaves(tree);
  }
  let requested: L = base;
  let settled: Promise<unknown> = Promise.resolve();

  const isLocale = (value: unknown): value is L => (locales as readonly unknown[]).includes(value);

  /** The locale's values there — inline, loaded before, or fetched now (once in flight); `false` — couldn't. */
  function ensure(locale: L): Promise<boolean> {
    if (values[locale]) {
      return Promise.resolve(true);
    }
    if (!source.load) {
      return Promise.resolve(false);
    }
    return loading[locale] ??= source.load(locale).then((chunk) => {
      delete loading[locale];
      if (chunk.hash !== source.hash) {
        return false;
      }
      values[locale] = chunk.values;
      return true;
    }, () => {
      delete loading[locale];
      return false;
    });
  }

  function select(locale: L): Promise<boolean> {
    if (!isLocale(locale)) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        throw new TypeError(`${WHERE_LOCALE}: select: ${describeValue(locale)} is not one of ${locales.join(', ')}`);
      }
      return Promise.resolve(false);
    }
    requested = locale;
    const done = ensure(locale).then((there) => {
      if (there && requested === locale) {
        $locale.setState(locale);
        return true;
      }
      return false;
    });
    settled = done;
    return done;
  }

  function detect(candidates: readonly (string | null | undefined)[]): L {
    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      if (isLocale(candidate)) {
        return candidate;
      }
      const parts = candidate.toLowerCase().split(/[-_]/);
      const language = parts[0];
      if (language === 'zh') {
        const chinese = parts.includes('hant') || (!parts.includes('hans') && HANT_REGIONS.has(parts[parts.length - 1])) ?
          'zh-Hant' : 'zh-Hans';
        if (isLocale(chinese)) {
          return chinese;
        }
      }
      const exact = locales.find((locale) => locale.toLowerCase() === candidate.toLowerCase());
      const found = exact ?? (isLocale(aliases[language]) ? aliases[language] as L : undefined) ??
        locales.find((locale) => locale.split('-')[0].toLowerCase() === language);
      if (found) {
        return found;
      }
    }
    return base;
  }

  return {
    $locale,
    locales,
    select,
    // `settled` never rejects: a failed load is `select`'s `false`
    ready: () => settled.then(() => undefined),
    load: ensure,
    detect,
    isLocale,
    pick: (entries) => entries[$locale.getState()] ?? entries[base] ??
      complain(`pick: no "${$locale.getState()}" or "${base}" in ${describeValue(entries)}`, ''),
    _set: (name) => sets.get(name),
    _values: (locale) => values[locale],
  };
}

function countLeaves(tree: TKeyTree): number {
  let count = 0;
  for (const node of tree) {
    count += typeof node === 'string' ? 1 : countLeaves(node[1]);
  }
  return count;
}

// ——— A set of messages ———————————————————————————————————————————————————————————————————————————————————————————

/** The set's keys: path → position (from `offset`), and the key constants' tree. */
function indexKeys(
  tree: TKeyTree, prefix: string, positions: Map<string, number>, constants: Record<string, unknown>,
  next: { at: number },
): void {
  for (const node of tree) {
    if (typeof node === 'string') {
      const path = prefix + node;
      positions.set(path, next.at++);
      constants[node] = path;
    } else {
      const group: Record<string, unknown> = {};
      constants[node[0]] = group;
      indexKeys(
        node[1], prefix + node[0] + DOT, positions, group, next,
      );
    }
  }
}

/**
 * A set of messages bound to the locale (D-060): a package's texts, read by key constants (D-064, D-066).
 *
 * @param locale - the app's locale (`createLocale`).
 * @param name - the set's name in the source (`sets` of the plugin, of `sourceOf`).
 *
 * @example
 * import type { en } from './i18n/en';
 * export const text = createMessages<typeof en>(locale, 'game');
 * export const K = text.keys;
 * text.t(K.hud.moves, { count: 3 }); // '3 moves'
 */
export function createMessages<T, const L extends string = string>(locale: TLocale<L>, name: string):
TMessagesSet<T, L> {
  const slice = locale._set(name);
  if (!slice) {
    throw new TypeError(`${WHERE_MESSAGES}: no set "${name}" in the source (the plugin's \`sets\`, sourceOf's keys)`);
  }
  const [
    tree,
    offset,
  ] = slice;
  const positions = new Map<string, number>();
  const keys: Record<string, unknown> = {};
  indexKeys(
    tree, '', positions, keys, {
      at: 0,
    },
  );
  const size = positions.size;
  const base = locale.locales[0];
  const compiledByLocale = new Map<string, TCompiledValue[]>();

  /** The set's messages compiled for a locale — all at once, the first time it's needed (message-maps). */
  function compiledOf(tag: string): TCompiledValue[] | undefined {
    let compiled = compiledByLocale.get(tag);
    if (compiled) {
      return compiled;
    }
    const values = locale._values(tag);
    if (!values) {
      return undefined;
    }
    compiled = new Array(size);
    const lookup = (key: string): string | undefined => {
      const at = positions.get(key);
      const message = at === undefined ? undefined : messageAt(tag, at);
      return typeof message === 'function' ? message(undefined) : undefined;
    };
    const missing: string[] = [];
    for (const [
      path,
      at,
    ] of positions) {
      const value = values[offset + at];
      if (value === null || value === undefined) {
        missing.push(path);
        continue;
      }
      const parse = expressionParser(
        tag, `${name}: ${path}`, lookup,
      );
      compiled[at] = typeof value === 'string' ? compileTemplate(value, parse) :
        value.map((item) => compileTemplate(item, parse));
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && missing.length) {
      console.warn(`[i18n] ${name}: "${tag}" has no ${missing.join(', ')} — showing "${base}"`);
    }
    compiledByLocale.set(tag, compiled);
    return compiled;
  }

  /** A position's message in a locale — the base's where the locale has none. */
  function messageAt(tag: string, at: number): TCompiledValue {
    return compiledOf(tag)?.[at] ?? compiledOf(base)?.[at];
  }

  let current = locale.$locale.getState();
  locale.$locale.watch((next) => {
    current = next;
  });

  function textOf(
    tag: string, key: string, vars: Record<string, unknown> | undefined, asParts: boolean,
  ):
    string | TPart[] {
    const at = positions.get(key);
    const unknownKey = at === undefined;
    const message = unknownKey ? undefined : messageAt(tag, at);
    if (typeof message !== 'function') {
      const text = complain(unknownKey ? `${name}: no message "${key}"` : `${name}: "${key}" is a list — use list()`,
        key);
      return asParts ? [
        {
          text,
        },
      ] : text;
    }
    if (!asParts) {
      return message(vars);
    }
    return message.parts ? message.parts(vars) : [
      {
        text: message(vars),
      },
    ];
  }

  const bound = new Map<string, TMessagesSet<T, L>['t']>();

  const format: TFormat = {
    number: (value, options) => (options ? new Intl.NumberFormat(current, options) :
      numberFormat(current, DECIMAL)).format(toNumber(value)),
    currency: (value, currency) => numberFormat(
      current, CURRENCY, currency,
    ).format(toNumber(value)),
    percent: (value) => numberFormat(current, PERCENT).format(toNumber(value)),
    date: (value, style) => dateFormat(current, style || 'medium').format(toDate(value)),
    clock: (value, now) => clockOf(
      current, toDate(value), now ?? Date.now(),
    ),
    relative: (value, now) => relativeOf(
      current, toDate(value), now ?? Date.now(),
    ),
    list: (items) => cached(`${current}|l`, () => new Intl.ListFormat(current)).format(items.map(String)),
  };

  return {
    keys: keys as TKeys<T>,
    locale,
    format,
    t: (key: string, vars?: Record<string, unknown>) => textOf(
      current, key, vars, false,
    ) as string,
    translate: (
      tag: L, key: string, vars?: Record<string, unknown>,
    ) => textOf(
      tag, key, vars, false,
    ) as string,
    parts: (key: string, vars?: Record<string, unknown>) => textOf(
      current, key, vars, true,
    ) as TPart[],
    list: (key: string) => {
      const at = positions.get(key);
      const message = at === undefined ? undefined : messageAt(current, at);
      return Array.isArray(message) ? message.map((item: TCompiled) => item(undefined)) :
        [complain(`${name}: "${key}" is not a list`, key)];
    },
    load: locale.load,
    _text: textOf,
    _bound: (tag: string) => {
      let t = bound.get(tag);
      if (!t) {
        t = ((key: string, vars?: Record<string, unknown>) => textOf(
          tag, key, vars, false,
        )) as TMessagesSet<T, L>['t'];
        bound.set(tag, t);
      }
      return t;
    },
    has: (key: string): key is never => positions.has(key) && !Array.isArray(locale._values(base)?.[offset +
      (positions.get(key) as number)]),
  } as unknown as TMessagesSet<T, L>;
}

// ——— One set, one call ——————————————————————————————————————————————————————————————————————————————————————————

/**
 * `createLocale` + `createMessages` of the only set — for an app with one set of texts (a page, a bot).
 *
 * @example
 * const i18n = createI18n<typeof en>({ source: sourceOf({ app: { en, ru } }, 'en'), locales: ['en', 'ru'] });
 * i18n.t(i18n.keys.menu.play); // 'Play'
 * await i18n.select('ru');
 */
export function createI18n<T, const L extends string = string>(options: TLocaleOptions<L>):
  TMessagesSet<T, L> & Omit<TLocale<L>, '_set' | '_values' | 'locales'> {
  const locale = createLocale(options);
  const set = createMessages<T, L>(locale, options.source.keys[0]?.[0] ?? '');
  return Object.assign(set, {
    $locale: locale.$locale,
    select: locale.select,
    ready: locale.ready,
    detect: locale.detect,
    isLocale: locale.isLocale,
    pick: locale.pick,
  });
}
