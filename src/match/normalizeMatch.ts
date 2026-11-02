import {
  nearestKnown,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  hasOwn,
} from '../hasOwn';
import {
  isArray,
} from '../is/isArray';
import {
  isPlainObject,
} from '../is/isPlainObject';
import {
  LOGICAL_KEYS,
  WHERE,
  operatorsOf,
} from './options';
import type {
  TMatch,
  TMatchNode,
  TMatchOperators,
  TMatchOptions,
} from './types';

/** An operator's name starts with it; a field's doesn't. */
const OPERATOR_MARK = '$';

/** `{}` matches any object — arrays and class instances too, as `isMatch` did. */
const ANY_OBJECT = [
  'object',
  'array',
];

/** What a walk over one pattern carries. */
type TContext = {
  operators: TMatchOperators;
  where: string;
  /** The lists and objects the walk is inside: one met again is a cycle. */
  inside: Set<object>;
};

/**
 * The pattern as a tree (fundamentool D-086): every shorthand gone — a value is `$eq`, a list of values `$in`, a RegExp
 * `$regex`, `{}` `$type`, a nested object a longer `path`, a negation (`$ne`, `$exists: false`) a `not`. What
 * `fundamentool/sql` compiles and a store's planner reads; `matchProvider` compiles the same tree.
 *
 * @param pattern - A pattern (`TMatch`).
 * @param options - `operators`: the registry, `STANDARD_OPERATORS` by default.
 * @returns The tree; a list of one is its only node.
 * @throws {TypeError} an unknown operator ("did you mean"), a wrong argument, operators mixed with fields, a cycle, a
 * function — at normalizing, never later.
 * @example
 * normalizeMatch({ kind: 'decision', status: ['proposed', 'provisional'], $not: { revised: { $exists: true } } });
 * // { kind: 'and', of: [
 * //   { kind: 'op', path: ['kind'], op: '$eq', argument: 'decision' },
 * //   { kind: 'op', path: ['status'], op: '$in', argument: ['proposed', 'provisional'] },
 * //   { kind: 'not', of: { kind: 'op', path: ['revised'], op: '$exists', argument: true } },
 * // ] }
 */
export function normalizeMatch(pattern: TMatch, options?: TMatchOptions): TMatchNode {
  const where = `${WHERE} normalizeMatch`;
  return normalizeWith(
    pattern, operatorsOf(options, where), where,
  );
}

/**
 * `normalizeMatch` with operators already checked — `matchProvider`'s first step.
 *
 * @param pattern - A pattern.
 * @param operators - The registry.
 * @param where - The prefix of a message.
 * @returns The tree.
 */
export function normalizeWith(
  pattern: TMatch, operators: TMatchOperators, where: string,
): TMatchNode {
  return nodeAt(
    pattern, [], {
      operators,
      where,
      inside: new Set(),
    },
  );
}

/** A value compared whole: a primitive or a `Date`. */
const isScalar = (value: unknown): boolean => value === null
  || typeof value !== 'object' && typeof value !== 'function' || value instanceof Date;

/** Where a message says it is: `at status`, `at summary.status`, `at the top`. */
export const atPath = (path: readonly string[]): string => (path.length ? `at ${path.join('.')}` : 'at the top');

function fail(context: TContext, text: string): TypeError {
  return new TypeError(`${context.where}: ${text}`);
}

function nodeAt(
  pattern: unknown, path: string[], context: TContext,
): TMatchNode {
  if (isArray(pattern)) {
    return listAt(
      pattern, path, context,
    );
  }
  if (pattern instanceof RegExp) {
    return operatorAt(
      '$regex', pattern, path, context, true,
    );
  }
  if (typeof pattern === 'function') {
    throw fail(context, `a function is not a pattern (${atPath(path)}): a check of its own is an operator — TMatchOperator`);
  }
  if (isPlainObject(pattern)) {
    return objectAt(
      pattern, path, context,
    );
  }
  return operatorAt(
    '$eq', pattern, path, context, true,
  );
}

/** Or: any of the patterns; a list of values only — `$in`; `[]` — nothing. */
function listAt(
  list: readonly unknown[], path: string[], context: TContext,
): TMatchNode {
  if (list.length > 0 && list.every(isScalar)) {
    return operatorAt(
      '$in', list, path, context, true,
    );
  }
  enter(
    list, path, context,
  );
  const of = list.map((pattern) => nodeAt(
    pattern, path, context,
  ));
  context.inside.delete(list);
  return of.length === 1 ? of[0] : {
    kind: 'or',
    of,
  };
}

/** And: every key — a field, an operator, `$or`, `$not`; `{}` — any object. */
function objectAt(
  pattern: Record<string, unknown>, path: string[], context: TContext,
): TMatchNode {
  const keys = Object.keys(pattern);
  if (keys.length === 0) {
    return operatorAt(
      '$type', ANY_OBJECT, path, context, true,
    );
  }
  const operator = keys.find((key) => key[0] === OPERATOR_MARK && !LOGICAL_KEYS.includes(key));
  const field = keys.find((key) => key[0] !== OPERATOR_MARK);
  if (operator !== undefined && field !== undefined) {
    throw fail(context, `the pattern ${atPath(path)} mixes operators (${operator}) and fields (${field}); a field whose name starts with $ is compared whole — { $eq: … } a level up`);
  }
  enter(
    pattern, path, context,
  );
  const of: TMatchNode[] = [];
  for (const key of keys) {
    const value = pattern[key];
    if (key === '$or') {
      if (!isArray(value)) {
        throw fail(context, `"$or" ${atPath(path)} expects a list of patterns, got ${describeValue(value)}`);
      }
      of.push(listAt(
        value, path, context,
      ));
    } else if (key === '$not') {
      of.push({
        kind: 'not',
        of: nodeAt(
          value, path, context,
        ),
      });
    } else if (key[0] === OPERATOR_MARK) {
      of.push(operatorAt(
        key, value, path, context, false,
      ));
    } else {
      of.push(nodeAt(
        value, [
          ...path,
          key,
        ], context,
      ));
    }
  }
  context.inside.delete(pattern);
  return of.length === 1 ? of[0] : {
    kind: 'and',
    of,
  };
}

function enter(
  pattern: object, path: string[], context: TContext,
): void {
  if (context.inside.has(pattern)) {
    throw fail(context, `the pattern ${atPath(path)} holds itself`);
  }
  context.inside.add(pattern);
}

/** An operator's node: its name known, its argument checked; a negation becomes `not`. */
function operatorAt(
  name: string, argument: unknown, path: string[], context: TContext, implied: boolean,
): TMatchNode {
  const operators = context.operators;
  const operator = hasOwn(operators, name) ? operators[name] : undefined;
  if (!operator) {
    const names = Object.keys(operators);
    if (implied) {
      throw fail(context, `the pattern ${atPath(path)} is compared by "${name}", which isn't among the operators: ${names.join(', ')}`);
    }
    const near = nearestKnown(name, names);
    throw fail(context, `unknown operator "${name}" ${atPath(path)}.${near ? ` Did you mean "${near}"?` : ''} Operators: ${names.join(', ')}`);
  }
  const problem = operator.check?.(argument);
  if (problem !== undefined) {
    throw fail(context, `"${name}" ${atPath(path)} expects ${problem}, got ${describeValue(argument)}`);
  }
  const negated = operator.negationOf?.(argument);
  if (negated) {
    return {
      kind: 'not',
      of: operatorAt(
        negated[0], negated[1], path, context, true,
      ),
    };
  }
  if (!operator.test) {
    throw fail(context, `"${name}" ${atPath(path)} has no test, and isn't another operator's negation for ${describeValue(argument)}`);
  }
  return {
    kind: 'op',
    path,
    op: name,
    argument,
  };
}
