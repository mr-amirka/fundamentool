import {
  hasOwn,
} from '../hasOwn';
import {
  isArray,
} from '../is/isArray';
import {
  atPath,
  normalizeWith,
} from './normalizeMatch';
import {
  WHERE,
  operatorsOf,
} from './options';
import type {
  TMatch,
  TMatchNode,
  TMatchOperators,
  TMatchOptions,
} from './types';

/** A compiled pattern: whether a value matches. */
export type TMatchPredicate<T = unknown> = (value: T) => boolean;

type TTest = (value: unknown) => boolean;

/** A path segment that indexes an array (`0`, `12`) instead of reaching into each element. */
const INDEX_KEY = /^(?:0|[1-9]\d*)$/;

/**
 * Compiles a pattern once into a predicate called per value (fundamentool D-086): a list — any of them; an object — every
 * key, partially (only the pattern's keys); a value — equal; a value on an array field — the array holds it; a nested
 * field under an array — any element's. A bad pattern throws here, never at testing.
 *
 * | Written | Means |
 * |---------|-------|
 * | `[p1, p2]` | any of the patterns; `[]` — nothing |
 * | `{ a: …, b: … }` | every key; `{}` — any object |
 * | `{ a: 5 }` | `a` equals 5 — or `a` is an array holding 5 |
 * | `{ a: [x, y] }` | `a` is any of these |
 * | `{ a: { b: 1 } }` | `a`'s `b` matches 1 |
 * | `{ a: { $gte: 1, $lt: 5 } }` | every operator holds for `a` |
 * | `{ a: /x/i }` | `a` is a string the RegExp finds something in |
 * | `{ $or: [p1, p2] }`, `{ $not: p }` | or, not — beside fields |
 *
 * An operator's `prepare` runs here, once: an operator counting from "now" counts from the compiling — recompile a
 * long-lived predicate to move it.
 *
 * @param pattern - A pattern (`TMatch`).
 * @param options - `operators`: the registry, `STANDARD_OPERATORS` by default (`{ ...STANDARD_OPERATORS, $within }`).
 * @returns The predicate.
 * @throws {TypeError} an unknown option or operator ("did you mean"), a wrong argument, operators mixed with fields, a
 * cycle, a function in the pattern.
 * @example
 * const isOpen = matchProvider([
 *   { kind: 'decision', status: ['proposed', 'provisional'], $not: { affects: { $has: 'USER_DRAFT' } } },
 *   { kind: 'decision', status: 'active', accepted: { $gte: '2026-10-30' } },
 * ]);
 * isOpen({ kind: 'decision', status: 'proposed', affects: ['packages/kit/'] }); // => true
 * isOpen({ kind: 'decision', status: 'active', accepted: '2026-10-28 12:46 MSK' }); // => false
 * nodes.filter(isOpen);
 */
export function matchProvider<T = unknown>(pattern: TMatch, options?: TMatchOptions): TMatchPredicate<T> {
  const where = `${WHERE} matchProvider`;
  const operators = operatorsOf(options, where);
  return compile(normalizeWith(
    pattern, operators, where,
  ), operators);
}

function compile(node: TMatchNode, operators: TMatchOperators): TTest {
  if (node.kind === 'and') {
    return every(node.of.map((of) => compile(of, operators)));
  }
  if (node.kind === 'or') {
    return some(node.of.map((of) => compile(of, operators)));
  }
  if (node.kind === 'not') {
    const test = compile(node.of, operators);
    return (value) => !test(value);
  }
  return operatorTest(node, operators);
}

function every(tests: TTest[]): TTest {
  const length = tests.length;
  return (value) => {
    let i = 0;
    for (; i < length; i++) {
      if (!tests[i](value)) {
        return false;
      }
    }
    return true;
  };
}

function some(tests: TTest[]): TTest {
  const length = tests.length;
  return (value) => {
    let i = 0;
    for (; i < length; i++) {
      if (tests[i](value)) {
        return true;
      }
    }
    return false;
  };
}

/** An operator's node: its argument prepared once; a throw of its `test` names the operator and the path. */
function operatorTest(node: TMatchNode & { kind: 'op' }, operators: TMatchOperators): TTest {
  const operator = operators[node.op];
  const prepared = operator.prepare ? operator.prepare(node.argument) : node.argument;
  const test = operator.test as (value: unknown, prepared: unknown) => boolean;
  const path = node.path;
  const run: TTest = (value) => {
    try {
      return test(value, prepared);
    } catch (error) {
      throw new Error(`${WHERE} "${node.op}" ${atPath(path)} threw: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  };
  if (path.length === 0) {
    return run;
  }
  const indexes = path.map((key) => INDEX_KEY.test(key));
  if (path.length === 1 && !indexes[0]) {
    // One field of an object — the usual case — read without the walk.
    const key = path[0];
    return (value) => (value !== null && typeof value === 'object' && !isArray(value)
      ? run(hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined)
      : reach(
        value, path, indexes, 0, run,
      ));
  }
  return (value) => reach(
    value, path, indexes, 0, run,
  );
}

/**
 * The value at `path` tested: own properties only; an array on the way — any element's, and a segment like `0` also
 * indexes it (as Mongo: `{ a: { 0: x } }` is `a`'s first element, or an element's own key `"0"`); a primitive or
 * nothing on the way — `undefined` tested.
 */
function reach(
  value: unknown, path: readonly string[], indexes: readonly boolean[], index: number, run: TTest,
): boolean {
  if (index === path.length) {
    return run(value);
  }
  if (value === null || typeof value !== 'object') {
    return run(undefined);
  }
  const key = path[index];
  if (isArray(value)) {
    if (indexes[index] && reach(
      value[key as unknown as number], path, indexes, index + 1, run,
    )) {
      return true;
    }
    const length = value.length;
    let i = 0;
    for (; i < length; i++) {
      if (reach(
        value[i], path, indexes, index, run,
      )) {
        return true;
      }
    }
    return false;
  }
  return reach(
    hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined, path, indexes, index + 1, run,
  );
}
