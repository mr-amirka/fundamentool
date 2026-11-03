import {
  escapeRegExp,
} from './escapeRegExp';
import {
  isArray,
} from './is/isArray';
import {
  custom,
  func,
  lazy,
  object,
  string,
} from './schema';

/**
 * The domain of a list option, given once: {@link pairsProvider} reads with it, {@link pairsSchema} checks with it.
 */
export type TPairsPreset = {
  /** Between the entries of the string form: `/[\s,|;]+/`. */
  readonly separator: string | RegExp;
  /** Between a name and its value, its first occurrence: `':'`. */
  readonly pair: string;
  /** The value of a name written alone (`'m'` → `'m'`); `undefined`, or no `alone` — a name alone is not allowed. */
  readonly alone?: (name: string) => string | undefined;
};

/** A list option as written: a separated string, an array of entries or an object `{ name: value }`. */
export type TPairsValue = string | readonly string[] | Readonly<Record<string, string>>;

/** One pair: `[name, value]`. */
export type TPair = [name: string, value: string];

/** Reads a list option into pairs; `undefined` and `null` — no pairs. */
export type TPairsReader = (value: TPairsValue | null | undefined) => TPair[];

/** What the reader met, for {@link pairsSchema}: a problem's text, or `''` for a pair read. */
export type TPairsVisit = (problem: string, entry: string, pair?: TPair) => boolean | void;

/** The preset's schema (lab D-023) — `PAIRS_PRESET().keys` is the list of its keys. */
export const PAIRS_PRESET = /*#__PURE__*/ lazy(() => object({
  separator: custom<string | RegExp>((value) => (typeof value === 'string' && value.length > 0)
    || value instanceof RegExp, 'a separator: a non-empty string or a RegExp'),
  pair: string().refine((value) => value.length > 0, 'expects a non-empty string, got an empty string'),
  alone: func().optional(),
}));

const WHERE = '[fundamentool] pairsProvider';

/**
 * Makes a reader of a list option: a separated string, an array of `name` / `name<pair>value` entries, or an object
 * `{ name: value }` — each into one list of `[name, value]` pairs. The core knows the mechanism; the preset knows the
 * domain: the separators, and what a name written alone means (lab D-044).
 *
 * The string is split by `separator` (spaces around `pair` are joined first: `'a : b'` is `'a:b'`); an array is read
 * entry by entry, an object key by key. Names and values are trimmed; what can't be read — an empty name, an empty
 * value, a name alone that `alone` doesn't allow, a non-string — is skipped, never thrown: the checks are
 * {@link pairsSchema}'s, in development. The order is kept and a name may repeat.
 *
 * @param preset - The separators and `alone`.
 * @returns The reader.
 * @example
 * const readAttrs = pairsProvider({ separator: /[\s,|;]+/, pair: ':', alone: (name) => name });
 * readAttrs('class, className:class'); // => [['class', 'class'], ['className', 'class']]
 * readAttrs(['m', 'iconM:m']);         // => [['m', 'm'], ['iconM', 'm']]
 * readAttrs({ className: 'class' });   // => [['className', 'class']]
 * readAttrs(undefined);                // => []
 */
export function pairsProvider(preset: TPairsPreset): TPairsReader {
  const read = pairsVisitor(preset);
  return (value) => {
    const out: TPair[] = [];
    read(value, (
      _problem, _entry, pair,
    ) => {
      pair && out.push(pair);
    });
    return out;
  };
}

/**
 * The reader's walk, shared by {@link pairsProvider} and {@link pairsSchema}: one rule of reading. `visit` gets each
 * entry — a pair read (`problem` is `''`), or why it is skipped; `true` from it stops the walk.
 *
 * @param preset - The separators and `alone`.
 * @returns The walk over a value.
 */
export function pairsVisitor(preset: TPairsPreset): (value: unknown, visit: TPairsVisit) => void {
  if (process.env.NODE_ENV !== 'production') {
    PAIRS_PRESET().parse(preset, WHERE);
  }
  const separator = preset.separator;
  const pair = preset.pair;
  const pairLength = pair.length;
  const alone = preset.alone;
  const aroundPair = new RegExp('\\s*' + escapeRegExp(pair) + '\\s*', 'g');

  /** One entry of the string or the array form. */
  function entry(text: string, visit: TPairsVisit): boolean | void {
    const at = text.indexOf(pair);
    const alonePart = at < 0;
    const name = (alonePart ? text : text.slice(0, at)).trim();
    if (!name) {
      return text.trim() ? visit('has no name', text) : false;
    }
    if (alonePart) {
      const own = alone && alone(name);
      return own === undefined
        ? visit('has no value: write "' + name + pair + '…"', text)
        : visit(
          '', text, [
            name,
            own,
          ],
        );
    }
    const value = text.slice(at + pairLength).trim();
    return value ? visit(
      '', text, [
        name,
        value,
      ],
    ) : visit('has no value after "' + pair + '"', text);
  }

  return (value, visit) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string') {
      for (const text of value.replace(aroundPair, pair).split(separator)) {
        if (entry(text, visit)) {
          return;
        }
      }
    } else if (isArray(value)) {
      for (const text of value) {
        if (typeof text === 'string' ? entry(text, visit) : visit('expects a string', String(text))) {
          return;
        }
      }
    } else {
      let given: unknown;
      let name: string;
      let text: string;
      for (const key of Object.keys(value as object)) {
        given = (value as Record<string, unknown>)[key];
        name = key.trim();
        if (typeof given !== 'string') {
          if (visit('expects a string as its value', key)) {
            return;
          }
          continue;
        }
        text = given.trim();
        if (!name ? visit('has no name', key + pair + given) : !text
          ? visit('has no value', key)
          : visit(
            '', key, [
              name,
              text,
            ],
          )) {
          return;
        }
      }
    }
  };
}
