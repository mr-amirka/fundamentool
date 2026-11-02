import {
  matchProvider,
  type TMatchPredicate,
} from '../match/matchProvider';
import type {
  TMatch,
} from '../match/types';

/** A pattern object compiled once: `isMatch(x, PATTERN)` in a loop compiles on the first call. */
const COMPILED = new WeakMap<object, TMatchPredicate>();

/**
 * Whether `value` matches `pattern` — `matchProvider`'s one-shot form (fundamentool D-086), the same grammar: only the
 * pattern's keys are compared, a list means any of its items, a RegExp finds in a string, `Date`s compare by time,
 * `null` matches only `null`. An object or list pattern is compiled once and kept — a pattern changed after its first
 * use is a new object, not the same one edited.
 *
 * @param value - The value to test.
 * @param pattern - The pattern (`TMatch`).
 * @returns `true` if `value` matches.
 * @throws {TypeError} a bad pattern (an unknown operator, a wrong argument) — as `matchProvider`.
 * @example
 * isMatch({ a: 1, b: 2 }, { a: 1 }); // => true
 * isMatch({ a: 1 }, { a: 2 });        // => false
 * isMatch({ tags: ['x', 'y'] }, { tags: 'y' }); // => true
 * isMatch(new Date(1), new Date(2)); // => false
 */
export function isMatch(value: unknown, pattern: TMatch): boolean {
  if (pattern === null || typeof pattern !== 'object') {
    return matchProvider(pattern)(value);
  }
  let predicate = COMPILED.get(pattern);
  if (!predicate) {
    predicate = matchProvider(pattern);
    COMPILED.set(pattern, predicate);
  }
  return predicate(value);
}
