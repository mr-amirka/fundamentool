import {
  repeat,
} from '../repeat';

/**
 * The CSS combinator that reaches a child at a depth: `0` → `''`, `1` → `>`, `2` → `>*>`. A limit on the depth is the
 * caller's: `childCombinator(Math.min(depth, 30))`.
 *
 * @param depth - How many levels down.
 * @returns The combinator.
 * @example
 * childCombinator(1); // => '>'
 * childCombinator(3); // => '>*>*>'
 */
export function childCombinator(depth: number): string {
  return depth < 1 ? '' : '>' + repeat('*>', depth - 1);
}
