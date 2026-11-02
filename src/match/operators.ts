import {
  isArray,
} from '../is/isArray';
import {
  isEqual,
} from '../is/isEqual';
import type {
  TMatchOperator,
  TMatchOperators,
} from './types';

/** `$eq` compares whole values to any depth: the argument is a finite pattern, so the walk ends where it ends. */
const DEEP = Infinity;

/** The types `$type` knows: `typeof`'s, with `null` and `array` apart from `object`. */
export const MATCH_TYPES = [
  'string',
  'number',
  'boolean',
  'bigint',
  'undefined',
  'null',
  'array',
  'object',
  'function',
  'symbol',
] as const;

/** A type `$type` knows. */
export type TMatchType = typeof MATCH_TYPES[number];

/**
 * A value's type as `$type` names it: `typeof`, except `null` and arrays.
 *
 * @example
 * matchTypeOf([1]); // => 'array'
 * matchTypeOf(null); // => 'null'
 * matchTypeOf(new Date()); // => 'object'
 */
export function matchTypeOf(value: unknown): TMatchType {
  return value === null ? 'null' : isArray(value) ? 'array' : typeof value;
}

/**
 * Equal by `$eq`'s rules: the whole value, or — for an array — one of its elements. A primitive argument — the usual
 * case — is compared without the deep walk: `includes` is `===` with `NaN` equal to `NaN`, as `isEqual`.
 */
function equals(value: unknown, argument: unknown): boolean {
  if (value === argument) {
    return true;
  }
  if (argument === null || typeof argument !== 'object') {
    return isArray(value) ? value.includes(argument) : argument !== argument && value !== value;
  }
  if (isEqual(
    value, argument, DEEP,
  )) {
    return true;
  }
  if (isArray(value)) {
    const length = value.length;
    let i = 0;
    for (; i < length; i++) {
      if (isEqual(
        value[i], argument, DEEP,
      )) {
        return true;
      }
    }
  }
  return false;
}

/** Ordered by `$gt` / `$lt`: numbers with numbers, strings with strings, `Date`s by time — never across. */
function orderOf(value: unknown, argument: number | string | Date): number | undefined {
  if (argument instanceof Date) {
    return value instanceof Date ? value.getTime() - argument.getTime() : undefined;
  }
  if (typeof value !== typeof argument) {
    return undefined;
  }
  return value === argument ? 0 : (value as number | string) > argument ? 1 : -1;
}

const ORDERED = 'a number, a string or a Date';

const checkOrdered = (argument: unknown): string | undefined => (
  typeof argument === 'number' && argument === argument
    || typeof argument === 'string' || argument instanceof Date && argument.getTime() === argument.getTime()
    ? undefined : ORDERED
);

/** A comparison: holds for the value — or, for an array, for one of its elements. */
function comparison(holds: (order: number) => boolean): TMatchOperator<number | string | Date> {
  const one = (value: unknown, argument: number | string | Date): boolean => {
    const order = orderOf(value, argument);
    return order !== undefined && holds(order);
  };
  return {
    check: checkOrdered,
    test: (value, argument) => {
      if (isArray(value)) {
        const length = value.length;
        let i = 0;
        for (; i < length; i++) {
          if (one(value[i], argument)) {
            return true;
          }
        }
        return false;
      }
      return one(value, argument);
    },
  };
}

/** `$has`'s argument, prepared: as given, and lowered when it is a string. */
type THasArgument = [unknown, string | undefined];

function has(value: unknown, argument: THasArgument): boolean {
  if (typeof value === 'string') {
    return argument[1] !== undefined && value.toLowerCase().includes(argument[1]);
  }
  if (isArray(value)) {
    const length = value.length;
    let i = 0;
    for (; i < length; i++) {
      if (has(value[i], argument)) {
        return true;
      }
    }
    return false;
  }
  return isEqual(
    value, argument[0], DEEP,
  );
}

/** Without `g` and `y`: their `lastIndex` would make `test` answer differently for the same string. */
const STATEFUL_FLAGS = /[gy]/g;

function regexpOf(argument: RegExp | readonly [string, string?]): RegExp {
  const source = argument instanceof RegExp ? argument.source : argument[0];
  const flags = argument instanceof RegExp ? argument.flags : argument[1] || '';
  return new RegExp(source, flags.replace(STATEFUL_FLAGS, ''));
}

function finds(value: unknown, regexp: RegExp): boolean {
  if (typeof value === 'string') {
    return regexp.test(value);
  }
  if (isArray(value)) {
    const length = value.length;
    let i = 0;
    for (; i < length; i++) {
      if (typeof value[i] === 'string' && regexp.test(value[i])) {
        return true;
      }
    }
  }
  return false;
}

const $eq: TMatchOperator = {
  test: equals,
};

const $ne: TMatchOperator = {
  negationOf: (argument) => [
    '$eq',
    argument,
  ],
};

const $in: TMatchOperator<readonly unknown[]> = {
  check: (argument) => (isArray(argument) ? undefined : 'a list of values'),
  test: (value, argument) => {
    const length = argument.length;
    let i = 0;
    for (; i < length; i++) {
      if (equals(value, argument[i])) {
        return true;
      }
    }
    return false;
  },
};

const $has: TMatchOperator<unknown, THasArgument> = {
  check: (argument) => (argument === undefined ? 'a string, or a value an array holds' : undefined),
  prepare: (argument) => [
    argument,
    typeof argument === 'string' ? argument.toLowerCase() : undefined,
  ],
  test: has,
};

const REGEX = 'a RegExp, or [source, flags] of a valid one';

const $regex: TMatchOperator<RegExp | readonly [string, string?], RegExp> = {
  check: (argument) => {
    if (argument instanceof RegExp) {
      return undefined;
    }
    if (!isArray(argument) || typeof argument[0] !== 'string' || argument[1] !== undefined && typeof argument[1] !== 'string') {
      return REGEX;
    }
    try {
      regexpOf(argument as [string, string?]);
      return undefined;
    } catch {
      return REGEX;
    }
  },
  prepare: regexpOf,
  test: finds,
};

const $exists: TMatchOperator<boolean> = {
  check: (argument) => (typeof argument === 'boolean' ? undefined : 'true or false'),
  negationOf: (argument) => (argument ? undefined : [
    '$exists',
    true,
  ]),
  test: (value) => value !== undefined,
};

const $type: TMatchOperator<TMatchType | readonly TMatchType[], readonly string[]> = {
  check: (argument) => {
    const list: readonly unknown[] = isArray(argument) ? argument : [argument];
    return list.length > 0 && list.every((type) => (MATCH_TYPES as readonly unknown[]).includes(type))
      ? undefined : `a type or a list of types: ${MATCH_TYPES.join(', ')}`;
  },
  prepare: (argument) => (isArray(argument) ? argument : [argument]),
  test: (value, types) => types.includes(matchTypeOf(value)),
};

/**
 * The operators a pattern may use by default (fundamentool D-086). A value on an array field holds for the array's
 * elements: `{ affects: 'x' }` — the array holds `'x'`.
 *
 * | Operator | Holds when the value… |
 * |----------|----------------------|
 * | `$eq` | equals it deeply (`Date`s by time); an array — or holds it |
 * | `$ne` | doesn't — written as `$not` of `$eq`, so on an array field none of its elements equals it |
 * | `$in` | equals any of a list |
 * | `$gt` `$gte` `$lt` `$lte` | is greater / less: numbers with numbers, strings with strings, `Date`s by time |
 * | `$has` | a string holds it, case aside; an array holds it, or a string of it does |
 * | `$regex` | a string the RegExp finds something in (`g` and `y` dropped); `[source, flags]` in JSON |
 * | `$exists` | is present (`true`) or absent (`false`, `$not` of `true`); `undefined` is absent |
 * | `$type` | is of the type or types (`matchTypeOf`) |
 *
 * @example
 * matchProvider({ edited: { $within: '2h' } }, { operators: { ...STANDARD_OPERATORS, $within: WITHIN } });
 */
export const STANDARD_OPERATORS: TMatchOperators = {
  $eq,
  $ne,
  $in,
  $gt: comparison((order) => order > 0),
  $gte: comparison((order) => order >= 0),
  $lt: comparison((order) => order < 0),
  $lte: comparison((order) => order <= 0),
  $has,
  $regex,
  $exists,
  $type,
};
