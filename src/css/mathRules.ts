import {
  array,
  boolean,
  lazy,
  object,
  string,
} from '../schema';

/** The rules of one property for `css.math`: what a bare number means, which units it takes, whether a minus may lead. */
export type TMathRules = {
  /** The property's name — for messages: `bottom`, `w`. */
  readonly name: string;
  /** The unit of a bare number: `px`; `''` — the property takes plain numbers (`line-height`). */
  readonly unit: string;
  /** The units it takes; with `%` both a percent and a fraction (`1/3` → `33.33%`). */
  readonly units: readonly string[];
  /** A minus before the first term is allowed (`-10`, `-$a`). */
  readonly negative: boolean;
};

/** The options of {@link mathRules}. */
export type TMathRulesOptions = {
  /** The property's name — for messages. */
  name: string;
  /** The unit of a bare number; `''` — plain numbers. */
  unit: string;
  /** The units it takes; with `%` — a percent and a fraction. */
  units: readonly string[];
  /** A minus before the first term. Not allowed by default. */
  negative?: boolean;
};

/** The options' schema (lab D-023): the bare number's unit is one of the units. */
export const MATH_RULES_OPTIONS = /*#__PURE__*/ lazy(() => object({
  name: string(),
  unit: string(),
  units: array(string()),
  negative: boolean().optional(),
}).refine((options) => !options.unit || options.units.indexOf(options.unit) > -1,
  (options) => '"unit" expects one of "units", got "' + options.unit + '"'));

const WHERE = '[fundamentool/css] mathRules';

/**
 * The rules of one property for `css.math` ({@link cssValuesProvider}). A cold path: built once per property.
 *
 * @param options - The property's name, the bare number's unit, the units it takes, the minus.
 * @returns The frozen rules.
 * @throws {TypeError} In development: an unknown key (with the nearest valid one), a value of the wrong type, a missing
 *   key, a bare number's unit that is not among the units.
 * @example
 * const widthRules = mathRules({ name: 'bottom', unit: 'px', units: ['px', 'rem', '%'] });
 */
export function mathRules(options: TMathRulesOptions): TMathRules {
  if (process.env.NODE_ENV !== 'production') {
    MATH_RULES_OPTIONS().parse(options, WHERE);
  }
  return Object.freeze({
    name: options.name,
    unit: options.unit,
    units: Object.freeze(options.units.slice()),
    negative: !!options.negative,
  });
}
