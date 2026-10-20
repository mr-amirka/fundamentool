// The options of the router's and the navigator's steps: one list of keys per kind of step, checked on every call
// (api-input-validation.md; the steps are user actions — not a hot path).
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  isObject,
} from '../is/isObject';

/** The single list of `pushLocation` / `replaceLocation`'s option keys. */
export const STEP_OPTION_KEYS = ['quiet'] as const;

/** The single list of `backLocation` / `backToRoot`'s option keys. */
export const BACK_OPTION_KEYS = [
  'force',
  'quiet',
] as const;

/** The single list of `params.set` / `remove` / `clear`'s option keys. */
export const PARAMS_OPTION_KEYS = [
  'replace',
  'quiet',
] as const;

/**
 * Checks a step's options: `undefined`, or an object of the known keys, each `true`, `false` or left out.
 *
 * @example
 * assertFlags('[fundamentool] createRouter pushLocation', options, STEP_OPTION_KEYS);
 */
export function assertFlags(
  where: string, options: unknown, keys: readonly string[],
): void {
  if (options === undefined) {
    return;
  }
  if (!isObject(options) || isArray(options)) {
    throw new TypeError(`${where}: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    where, options as Record<string, unknown>, keys,
  );
  for (const key of keys) {
    const value = (options as Record<string, unknown>)[key];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new TypeError(`${where}: "${key}" expects true or false, got ${describeValue(value)}`);
    }
  }
}
