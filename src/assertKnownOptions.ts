/**
 * Option checks for public entry points (lab convention `api-input-validation.md`):
 * an unknown key is an error with the nearest known one, never silently ignored.
 * Cold path only — called once, when a factory is created. Moved here from
 * web-games `@wg/options` (2026-10-18), which now re-exports it.
 */

import {
  editDistance,
} from './editDistance';

/**
 * The name of `known` nearest to `key` (case aside, at most two edits away) — the "did you mean" of an error; `''` —
 * none is near.
 *
 * @example
 * nearestKnown('onbording', ['onboarding', 'signIn']); // => 'onboarding'
 * nearestKnown('x', ['onboarding']); // => ''
 */
export function nearestKnown(key: string, known: readonly string[]): string {
  let best = '';
  let bestDistance = 3;
  for (const candidate of known) {
    const distance = editDistance(
      key.toLowerCase(), candidate.toLowerCase(), 2,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * The message for an option outside `known`: with the nearest known one ("did you mean"), or the list of them — the
 * one place it is written (`assertKnownOptions`, `fundamentool/schema`'s objects).
 *
 * @example
 * unknownOptionText('kep', ['keep']); // => 'unknown option "kep". Did you mean "keep"?'
 */
export function unknownOptionText(key: string, known: readonly string[]): string {
  const best = nearestKnown(key, known);
  return best ? `unknown option "${key}". Did you mean "${best}"?` : `unknown option "${key}". Known options: ${known.join(', ')}`;
}

/**
 * Throws if `options` has a key outside `known` (`undefined` values are treated as absent).
 *
 * @param where   - prefix for messages, e.g. `[fundamentool] createNavigation`.
 * @param options - the object passed by the caller.
 * @param known   - the full list of accepted keys.
 * @throws {TypeError} `unknown option "x". Did you mean "y"?` or `… Known options: a, b, c`.
 *
 * @example
 * assertKnownOptions('[@wg/content] createContentLoader', { manifesturl: '/x' }, ['manifestUrl']);
 * // TypeError: [@wg/content] createContentLoader: unknown option "manifesturl". Did you mean "manifestUrl"?
 */
export function assertKnownOptions(
  where: string, options: object, known: readonly string[],
): void {
  const record = options as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (record[key] === undefined || known.includes(key)) {
      continue;
    }
    throw new TypeError(`${where}: ${unknownOptionText(key, known)}`);
  }
}
