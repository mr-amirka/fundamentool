/**
 * `fundamentool/match`'s types: a pattern as written, the tree it normalizes to, an operator of the registry
 * (fundamentool D-086, lab D-042).
 */

/** A value a pattern compares with: equal by `$eq`'s rules. */
export type TMatchScalar = string | number | boolean | bigint | null | undefined | Date;

/**
 * A pattern: a list — any of them; a plain object — every key (a field, an operator `$…`, `$or`, `$not`); a RegExp —
 * a string it finds something in; anything else — equal.
 */
export type TMatch = TMatchScalar | RegExp | readonly TMatch[] | { readonly [key: string]: TMatch | unknown };

/** The pattern as a tree: every shorthand gone — what `matchProvider` compiles and a SQL dialect writes. */
export type TMatchNode =
  | { kind: 'and';
    of: TMatchNode[] }
  | { kind: 'or';
    of: TMatchNode[] }
  | { kind: 'not';
    of: TMatchNode }
  | { kind: 'op';
    path: string[];
    op: string;
    argument: unknown };

/**
 * An operator of the registry: how its argument is checked and prepared once, at compiling, and how a value is
 * tested — the hot part.
 */
export type TMatchOperator<A = any, P = any> = {
  /** What the argument should be, when it isn't (`'a number, a string or a Date'`); `undefined` — it is fine. */
  check?: (argument: unknown) => string | undefined;
  /**
   * The operator is another one's negation for this argument: `[operator, argument]` it negates, `undefined` — it is
   * not. `$ne: x` is written as `$not: { $eq: x }` — so on an array field it means "none of the elements", and a SQL
   * dialect needs no handler for it.
   */
  negationOf?: (argument: A) => readonly [operator: string, argument: unknown] | undefined;
  /** Prepares the argument once (a word lowered, a RegExp rebuilt); the result goes to `test`. */
  prepare?: (argument: A) => P;
  /**
   * Called per value — the value at the operator's path (`undefined` when it is absent). Only an operator that is
   * always another one's negation goes without it.
   */
  test?: (value: unknown, prepared: P) => boolean;
};

/** The registry: an operator by its name, which starts with `$`. */
export type TMatchOperators = Readonly<Record<string, TMatchOperator>>;

/** `matchProvider`'s and `normalizeMatch`'s options. */
export type TMatchOptions = {
  /** The operators a pattern may use; `STANDARD_OPERATORS` by default. A project adds its own: `{ ...STANDARD_OPERATORS, $within }`. */
  operators?: TMatchOperators;
};
