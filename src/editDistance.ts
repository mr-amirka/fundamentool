/**
 * Levenshtein distance between two strings: the fewest single-character insertions, deletions and substitutions that
 * turn `a` into `b`. With `limit`, it stops as soon as the distance is sure to exceed it and returns `limit + 1` — the
 * cheap form for "did you mean", where only small distances matter. Case counts: lower both first to ignore it.
 *
 * @param a - the first string.
 * @param b - the second string.
 * @param limit - the largest distance of interest; above it the result is `limit + 1`. Default: no limit.
 * @returns the distance, or `limit + 1` when it is greater than `limit`.
 *
 * @example
 * editDistance('kitten', 'sitting');    // 3
 * editDistance('kitten', 'sitting', 2); // 3 — "more than 2", found without finishing
 * editDistance('onbording', 'onboarding', 2); // 1
 */
export function editDistance(
  a: string, b: string, limit = Infinity,
): number {
  const lengthA = a.length;
  const lengthB = b.length;
  if (Math.abs(lengthA - lengthB) > limit) {
    return limit + 1;
  }
  let previous: number[] = [];
  let current: number[];
  let rowMin: number;
  let value: number;
  let i = 1;
  let j = 0;
  for (; j <= lengthB; j++) {
    previous.push(j);
  }
  for (; i <= lengthA; i++) {
    current = [i];
    rowMin = i;
    for (j = 1; j <= lengthB; j++) {
      value = Math.min(
        previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
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
