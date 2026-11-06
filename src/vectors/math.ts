/**
 * The math of `fundamentool/vectors` (fundamentool D-099): the dot product, the nearest vectors and a merge of rankings
 * — pure, sync, run in hot loops over thousands of vectors.
 */

/** A vector: the numbers of an embedding, a `Float32Array` from a model or plain numbers. */
export type TVector = ArrayLike<number>;

/** One of `nearest`'s hits: the vector's index in the list and its score, `[index, score]` (`coding.md` § 2). */
export type TNearestHit = [index: number, score: number];

/** One of `fuseRanks`' hits: the id and its fused score, `[id, score]`. */
export type TFusedHit = [id: string, score: number];

/** The prefix of the module's messages. */
export const WHERE = '[fundamentool/vectors]';

/** The `k` of reciprocal rank fusion: a rank `r` adds `1 / (k + r)`; 60 is the value its authors measured best. */
const RRF_K = 60;

/**
 * The dot product of two vectors of one length — the cosine of the angle between them when both are of unit length, as
 * an embedder gives them.
 *
 * @param a - A vector.
 * @param b - A vector of the same length.
 * @returns The sum of their products.
 * @throws {TypeError} In development, the lengths differ.
 * @example
 * dot([0.6, 0.8], [0.8, 0.6]); // => 0.96
 */
export function dot(a: TVector, b: TVector): number {
  const length = a.length;
  if (process.env.NODE_ENV !== 'production' && b.length !== length) {
    throw new TypeError(`${WHERE} dot: vectors of one length expected, got ${length} and ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * The `k` vectors closest to a query, by the dot product, best first; equal scores keep the lower index first.
 *
 * @param query   - The query's vector.
 * @param vectors - The vectors to rank, each of the query's length.
 * @param k       - How many to return; fewer when the list (or what `where` keeps) is shorter.
 * @param options - `where(index)`: whether a vector takes part, asked before it is scored (a type, a scope).
 * @returns `[index, score]` pairs.
 * @throws {TypeError} `k` isn't a whole number ≥ 0; in development, a vector's length differs from the query's.
 * @example
 * nearest([1, 0], [[0, 1], [0.8, 0.6], [1, 0]], 2); // => [[2, 1], [1, 0.8]]
 * nearest([1, 0], [[0, 1], [0.8, 0.6], [1, 0]], 2, { where: (index) => index !== 2 }); // => [[1, 0.8], [0, 0]]
 */
export function nearest(
  query: TVector, vectors: readonly TVector[], k: number, options: { where?: (index: number) => boolean } = {},
): TNearestHit[] {
  if (!Number.isInteger(k) || k < 0) {
    throw new TypeError(`${WHERE} nearest: k is a whole number ≥ 0, got ${String(k)}`);
  }
  const where = options.where;
  const best: TNearestHit[] = [];
  const count = vectors.length;
  for (let index = 0; index < count; index++) {
    if (where !== undefined && !where(index)) {
      continue;
    }
    const score = dot(query, vectors[index]);
    // The kept hits are sorted; a new one goes in after every hit at least as good (ties: the lower index first).
    let at = best.length;
    while (at > 0 && best[at - 1][1] < score) {
      at--;
    }
    if (at < k) {
      best.splice(
        at, 0, [
          index,
          score,
        ],
      );
      if (best.length > k) {
        best.pop();
      }
    }
  }
  return best;
}

/**
 * Rankings merged by their ranks, not their scores (reciprocal rank fusion): an id at rank `r` of a list (from 1) adds
 * `1 / (k + r)` to its score. Scores of different searches don't compare — a word search's BM25 is unbounded, a cosine
 * is at most 1 — so adding them ranks by whichever is larger; ranks always compare.
 *
 * @param lists   - The rankings, each its ids best first; an id twice in one list counts at its first place.
 * @param options - `k` (default 60): how much a top place outweighs a lower one — smaller favours the top.
 * @returns `[id, score]` tuples, best first, as `nearest` gives `[index, score]`; equal scores keep the order in which
 *   they were first seen. The score lets a caller order merged lists of its own against each other.
 * @throws {TypeError} `k` isn't a number ≥ 0.
 * @example
 * fuseRanks([['editDistance', 'trim'], ['spaces', 'editDistance']]);
 * // => [['editDistance', 0.0325], ['spaces', 0.0164], ['trim', 0.0161]]
 */
export function fuseRanks(lists: readonly (readonly string[])[], options: { k?: number } = {}): TFusedHit[] {
  const k = options.k ?? RRF_K;
  if (typeof k !== 'number' || !(k >= 0)) {
    throw new TypeError(`${WHERE} fuseRanks: k is a number ≥ 0, got ${String(k)}`);
  }
  const scores = new Map<string, number>();
  for (const list of lists) {
    const seen = new Set<string>();
    const length = list.length;
    for (let rank = 0; rank < length; rank++) {
      const id = list[rank];
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    }
  }
  // A Map keeps the order of first insertion, and the sort is stable.
  return [...scores].sort((a, b) => b[1] - a[1]);
}
