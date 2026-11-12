/**
 * The optimal string alignment distance between two strings: the fewest single-character insertions, deletions,
 * substitutions and swaps of two neighbouring characters that turn `a` into `b`, no substring edited twice. It is
 * `editDistance` with a swap counted as one edit — `statsu` is one edit from `status`, two from `state` — the measure
 * a "did you mean" wants, where a swap is the commonest slip. With `limit`, it stops as soon as the distance is sure to
 * exceed it and returns `limit + 1`. Case counts: lower both first to ignore it.
 *
 * @param a - the first string.
 * @param b - the second string.
 * @param limit - the largest distance of interest; above it the result is `limit + 1`. Default: no limit.
 * @returns the distance, or `limit + 1` when it is greater than `limit`.
 *
 * @example
 * alignmentDistance('statsu', 'status'); // 1 — one swap
 * alignmentDistance('statsu', 'state');  // 2
 * alignmentDistance('ca', 'abc');        // 3 — a substring is edited once (Damerau's unrestricted distance says 2)
 */
export function alignmentDistance(
  a: string, b: string, limit = Infinity,
): number {
  const lengthA = a.length;
  const lengthB = b.length;
  if (Math.abs(lengthA - lengthB) > limit) {
    return limit + 1;
  }
  // Three rows: the one before the previous one, for a swap.
  let before: number[] = [];
  let previous: number[] = [];
  let current: number[];
  let rowMin: number;
  let value: number;
  let charA: string;
  let i = 1;
  let j = 0;
  for (; j <= lengthB; j++) {
    previous.push(j);
  }
  for (; i <= lengthA; i++) {
    current = [i];
    rowMin = i;
    charA = a[i - 1];
    for (j = 1; j <= lengthB; j++) {
      value = Math.min(
        previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (charA === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && charA === b[j - 2] && a[i - 2] === b[j - 1] && before[j - 2] + 1 < value) {
        value = before[j - 2] + 1;
      }
      current.push(value);
      if (value < rowMin) {
        rowMin = value;
      }
    }
    // A swap reaches back two rows, so a row's minimum alone can't stop it: both rows above the limit can.
    if (rowMin > limit && (i === 1 || Math.min(...previous) > limit)) {
      return limit + 1;
    }
    before = previous;
    previous = current;
  }
  return Math.min(previous[lengthB], limit + 1);
}
