import {
  func,
  lazy,
  object,
  record,
} from '../schema';
import {
  STANDARD_OPERATORS,
} from './operators';
import type {
  TMatchOperators,
  TMatchOptions,
} from './types';

/** The prefix of the module's messages. */
export const WHERE = '[fundamentool/match]';

/** The keys a pattern spells logic with; no operator takes their names. */
export const LOGICAL_KEYS: readonly string[] = [
  '$or',
  '$not',
];

const OPERATOR = () => object({
  check: func().optional(),
  negationOf: func().optional(),
  prepare: func().optional(),
  test: func().optional(),
}).refine((operator) => operator.test !== undefined || operator.negationOf !== undefined,
  'an operator with test, or with negationOf when it is always another one\'s negation');

const misnamed = (operators: Record<string, unknown>): string | undefined => Object.keys(operators)
  .find((name) => name[0] !== '$' || LOGICAL_KEYS.includes(name));

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  operators: record(OPERATOR()).refine((operators) => misnamed(operators) === undefined,
    (operators) => `an operator's name starts with $ and isn't ${LOGICAL_KEYS.join(' or ')}: "${misnamed(operators)}"`).optional(),
}));

/**
 * The operators `options` give: `STANDARD_OPERATORS` when they give none. Checked in development only
 * (`api-input-validation.md`, lab D-023) — a pattern, data that may come from JSON, is checked always.
 *
 * @param options - What the caller passed to `matchProvider` / `normalizeMatch`.
 * @param where - The prefix of a message: `[fundamentool/match] matchProvider`.
 * @throws {TypeError} an unknown option ("did you mean"), an operator that isn't one, a name without `$`.
 */
export function operatorsOf(options: unknown, where: string): TMatchOperators {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options || {}, where);
  }
  return (options as TMatchOptions | undefined)?.operators || STANDARD_OPERATORS;
}
