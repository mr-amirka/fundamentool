import {
  escapeRegExp,
} from './escapeRegExp';
import {
  isArray,
} from './is/isArray';
import {
  isObject,
} from './is/isObject';
import {
  PAIRS_PRESET,
  pairsVisitor,
} from './pairsProvider';
import type {
  TPairsPreset,
  TPairsValue,
} from './pairsProvider';
import {
  custom,
  func,
  lazy,
  object,
} from './schema';
import type {
  TSchema,
} from './schema';
/** {@link pairsSchema}'s preset: {@link TPairsPreset} and the domain's own rule over each pair. */
export type TPairsSchemaPreset = TPairsPreset & {
  /** The domain's rule: `''` — the pair fits; otherwise the reason (`'a pattern is not a target'`). */
  readonly check?: (name: string, value: string) => string;
};

/** What a list option is, in a message. */
const LIST = 'a list — a string "a, b:c", an array ["a", "b:c"] or an object { b: "c" }';

const PAIRS_SCHEMA_PRESET = /*#__PURE__*/ lazy(() => object({
  ...PAIRS_PRESET().shape,
  check: func().optional(),
}));

const WHERE = '[fundamentool] pairsSchema';

/**
 * A schema node for a list option read by {@link pairsProvider} with the same preset — for an options object, checked
 * in development (`api-input-validation.md` point 4). It reads the value with the same walk (one rule of reading) and
 * reports the first problem: the shape; an entry the reader would skip; an array entry holding a separator (two
 * entries written as one); the preset's `check`.
 *
 * @param preset - The reader's preset and `check`.
 * @returns The schema.
 * @example
 * const ATTRS = { separator: /[\s,|;]+/, pair: ':', alone: (name: string) => (name[0] === '*' ? undefined : name) };
 * const OPTIONS = lazy(() => object({ attrs: pairsSchema(ATTRS).optional() }));
 * OPTIONS().parse({ attrs: '*Class' }, '[minotation] createScanner');
 * // TypeError: [minotation] createScanner: "attrs" entry "*Class" has no value: write "*Class:…"
 * OPTIONS().parse({ attrs: ['class, className:class'] }, '[minotation] createScanner');
 * // TypeError: … "attrs" entry "class, className:class" holds a separator: write each entry apart
 */
export function pairsSchema(preset: TPairsSchemaPreset): TSchema<TPairsValue> {
  if (process.env.NODE_ENV !== 'production') {
    PAIRS_SCHEMA_PRESET().parse(preset, WHERE);
  }
  // The walk takes the reader's keys only: `check` is this schema's.
  const read = pairsVisitor({
    separator: preset.separator,
    pair: preset.pair,
    alone: preset.alone,
  });
  const separator = preset.separator;
  const check = preset.check;
  const aroundPair = new RegExp('\\s*' + escapeRegExp(preset.pair) + '\\s*', 'g');
  const separatorAt = typeof separator === 'string' ? null : new RegExp(separator.source, separator.flags.replace('g', ''));
  /** An array entry holding a separator — two entries written as one (`'class, className:class'`). */
  const holdsSeparator = (text: string): boolean => {
    text = text.trim().replace(aroundPair, preset.pair);
    return separatorAt ? separatorAt.test(text) : text.indexOf(separator as string) > -1;
  };

  /** The first problem of a value of the right shape, or `''`. */
  function problemOf(value: TPairsValue): string {
    const fromArray = isArray(value);
    let found = '';
    read(value, (
      problem, entry, pair,
    ) => {
      if (!problem && fromArray && holdsSeparator(entry)) {
        problem = 'holds a separator: write each entry apart';
      }
      if (problem) {
        found = 'entry "' + entry + '" ' + problem;
        return true;
      }
      problem = check ? check(pair![0], pair![1]) : '';
      if (problem) {
        found = 'entry "' + entry + '": ' + problem;
        return true;
      }
      return false;
    });
    return found;
  }

  return custom<TPairsValue>((value) => typeof value === 'string' || isArray(value) || isObject(value), LIST)
    .refine((value) => !problemOf(value), problemOf);
}
