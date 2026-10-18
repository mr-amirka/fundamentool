/**
 * Option checks for public entry points (lab convention `api-input-validation.md`):
 * an unknown key is an error with the nearest known one, never silently ignored.
 * Cold path only — called once, when a factory is created. Moved here from
 * web-games `@wg/options` (2026-10-18), which now re-exports it.
 */

/** Levenshtein distance, early-exit above `limit` (only small distances matter for "did you mean"). */
function editDistance(
  a: string, b: string, limit: number,
): number {
  const lengthA = a.length;
  const lengthB = b.length;
  if (Math.abs(lengthA - lengthB) > limit) {
    return limit + 1;
  }
  let previous: number[] = [];
  let current: number[] = [];
  let j = 0;
  for (; j <= lengthB; j++) {
    previous.push(j);
  }
  let i = 1;
  for (; i <= lengthA; i++) {
    current = [i];
    let rowMin = i;
    for (j = 1; j <= lengthB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost,
      );
      current.push(value);
      if (value < rowMin) {
        rowMin = value;
      }
    }
    if (rowMin > limit) {
      return limit + 1;
    }
    previous = current;
  }
  return previous[lengthB];
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
    throw new TypeError(best
      ? `${where}: unknown option "${key}". Did you mean "${best}"?`
      : `${where}: unknown option "${key}". Known options: ${known.join(', ')}`);
  }
}
