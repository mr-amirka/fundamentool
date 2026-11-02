import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  WHERE,
  checkOptions,
} from './options';
import type {
  TAliasNode,
  TColumnNode,
  TCompareNode,
  TCompareOp,
  TDeleteNode,
  TDeleteOptions,
  TFnNode,
  TFrom,
  TInNode,
  TInsertNode,
  TInsertOptions,
  TIsNullNode,
  TJoinNode,
  TJsonGetNode,
  TLikeNode,
  TLogicNode,
  TNotNode,
  TOnConflict,
  TOrderNode,
  TParamNode,
  TRawNode,
  TSelectNode,
  TSelectOptions,
  TSqlExpr,
  TSqlNode,
  TTableNode,
  TUpdateNode,
  TUpdateOptions,
  TValueNode,
} from './types';

/** A function's name, written as is: a word. */
const FUNCTION_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Whether `value` is a node: a plain object with a string `kind` — a `Uint8Array` or a `Date` is a value.
 *
 * @example
 * isSqlNode(col('id')); // => true
 * isSqlNode('id');      // => false
 */
export function isSqlNode(value: unknown): value is TSqlNode {
  return value !== null && typeof value === 'object' && !isArray(value) && !(value instanceof Uint8Array)
    && typeof (value as { kind?: unknown }).kind === 'string';
}

/** A node as it is; a value as a parameter. */
const expr = (value: TSqlExpr): TSqlNode => (isSqlNode(value) ? value : valueNode(value));

/** A name as a column; a node as it is. */
const columnOf = (value: string | TSqlNode): TSqlNode => (typeof value === 'string' ? col(value) : value);

/** A source of rows: a table's name, or the node. */
const sourceOf = (from: TFrom): TSqlNode => (typeof from === 'string' ? table(from) : from);

const INSERT_INTO = 'insertInto';
const UPDATE = 'update';

const fail = (member: string, text: string): TypeError => new TypeError(`${WHERE} ${member}: ${text}`);

/**
 * A value bound as a parameter. A JS value where an expression goes becomes one by itself — `eq(col('kind'), 'x')`.
 *
 * @example
 * valueNode(7); // => { kind: 'value', value: 7 } — written "?", bound to 7
 */
export function valueNode(value: unknown): TValueNode {
  return {
    kind: 'value',
    value,
  };
}

/**
 * A column, its parts quoted: `col('u.kind')` → `"u"."kind"`; `col('*')`, `col('u.*')` — every column.
 *
 * @example
 * selectFrom('units', { columns: [col('u.id')] });
 */
export function col(name: string): TColumnNode {
  if (typeof name !== 'string' || name === '') {
    throw fail('col', `expects a column's name, got ${describeValue(name)}`);
  }
  return {
    kind: 'column',
    name,
  };
}

/**
 * A named parameter: its value is given each time the query runs, so it is compiled once (`statement.all({ file })`).
 *
 * @example
 * const ofFile = db.prepare(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
 * ofFile.all({ file: 'PLAN.md' });
 */
export function param(name: string): TParamNode {
  if (typeof name !== 'string' || name === '') {
    throw fail('param', `expects a parameter's name, got ${describeValue(name)}`);
  }
  return {
    kind: 'param',
    name,
  };
}

/**
 * Trusted SQL text, written as is — for what no node writes. Never built from input: a value is a parameter.
 *
 * @example
 * fn('count', raw('*')); // count(*)
 */
export function raw(text: string): TRawNode {
  if (typeof text !== 'string') {
    throw fail('raw', `expects SQL text, got ${describeValue(text)}`);
  }
  return {
    kind: 'raw',
    text,
  };
}

/**
 * A function call; its name must be a word, its arguments are expressions (a value — a parameter).
 *
 * @example
 * fn('bm25', col('units_fts'), 10, 5); // bm25("units_fts", ?, ?)
 */
export function fn(name: string, ...args: TSqlExpr[]): TFnNode {
  if (typeof name !== 'string' || !FUNCTION_NAME.test(name)) {
    throw fail('fn', `expects a function's name — a word — got ${describeValue(name)}`);
  }
  return {
    kind: 'fn',
    name,
    args: args.map(expr),
  };
}

/**
 * Every condition; `and()` — always true.
 *
 * @example
 * and(eq(col('kind'), 'decision'), isNull(col('revised'))); // "kind" = ? AND "revised" IS NULL
 */
export function and(...conditions: TSqlNode[]): TLogicNode {
  return {
    kind: 'and',
    of: conditions,
  };
}

/**
 * Any of the conditions; `or()` — never true.
 *
 * @example
 * or(eq(col('status'), 'proposed'), eq(col('status'), 'provisional'));
 */
export function or(...conditions: TSqlNode[]): TLogicNode {
  return {
    kind: 'or',
    of: conditions,
  };
}

/**
 * Not the condition.
 *
 * @example
 * not(isNull(col('revised'))); // NOT ("revised" IS NULL)
 */
export function not(condition: TSqlNode): TNotNode {
  return {
    kind: 'not',
    of: condition,
  };
}

function compare(
  op: TCompareOp, member: string, left: TSqlExpr, right: TSqlExpr,
): TCompareNode {
  if (left === null || right === null) {
    throw fail(member, `a comparison with null is never true in SQL — isNull(x)${member === 'ne' ? ' under not()' : ''}`);
  }
  return {
    kind: 'compare',
    op,
    left: expr(left),
    right: expr(right),
  };
}

/**
 * `a = b`; a value — a parameter. With `null` — an error: it is never true in SQL, `isNull` is.
 *
 * @example
 * eq(col('kind'), 'decision'); // "kind" = ?   params ['decision']
 */
export const eq = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '=', 'eq', left, right,
);

/**
 * `a <> b`.
 *
 * @example
 * ne(col('status'), 'done');
 */
export const ne = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '<>', 'ne', left, right,
);

/**
 * `a < b`.
 *
 * @example
 * lt(col('line'), 10);
 */
export const lt = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '<', 'lt', left, right,
);

/**
 * `a <= b`.
 *
 * @example
 * lte(col('line'), 10);
 */
export const lte = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '<=', 'lte', left, right,
);

/**
 * `a > b`.
 *
 * @example
 * gt(col('mtime'), param('since'));
 */
export const gt = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '>', 'gt', left, right,
);

/**
 * `a >= b`.
 *
 * @example
 * gte(col('mtime'), param('since'));
 */
export const gte = (left: TSqlExpr, right: TSqlExpr): TCompareNode => compare(
  '>=', 'gte', left, right,
);

/**
 * `x IN (…)`; an empty list — never true.
 *
 * @example
 * inList(col('kind'), ['decision', 'plan']); // "kind" IN (?, ?)
 */
export function inList(of: TSqlExpr, list: readonly TSqlExpr[]): TInNode {
  if (!isArray(list)) {
    throw fail('inList', `expects a list, got ${describeValue(list)}`);
  }
  return {
    kind: 'in',
    of: expr(of),
    list: list.map(expr),
  };
}

/**
 * `x LIKE pattern` — `%` any text, `_` one character; in SQLite case aside for ASCII only.
 *
 * @example
 * like(col('path'), 'packages/%');
 */
export function like(of: TSqlExpr, pattern: TSqlExpr): TLikeNode {
  return {
    kind: 'like',
    of: expr(of),
    pattern: expr(pattern),
  };
}

/**
 * `x IS NULL`.
 *
 * @example
 * isNull(col('revised'));
 */
export function isNull(of: TSqlExpr): TIsNullNode {
  return {
    kind: 'is-null',
    of: expr(of),
  };
}

/**
 * A field inside a JSON column; the dialect writes it (`json_extract` in SQLite).
 *
 * @param of - The JSON column.
 * @param path - The keys down to the field; `[]` — the whole value.
 * @example
 * jsonGet(col('attrs'), ['status']); // json_extract("attrs", '$.status')
 */
export function jsonGet(of: TSqlExpr, path: string | readonly string[]): TJsonGetNode {
  const keys = typeof path === 'string' ? [path] : path;
  if (!isArray(keys) || !keys.every((key) => typeof key === 'string')) {
    throw fail('jsonGet', `expects a key or a list of keys, got ${describeValue(path)}`);
  }
  return {
    kind: 'json-get',
    of: expr(of),
    path: keys,
  };
}

/**
 * An expression with a name, in a select list.
 *
 * @example
 * selectFrom('units', { columns: [alias(fn('count', raw('*')), 'n')] }); // SELECT count(*) AS "n" FROM "units"
 */
export function alias(of: TSqlExpr, name: string): TAliasNode {
  if (typeof name !== 'string' || name === '') {
    throw fail('alias', `expects a name, got ${describeValue(name)}`);
  }
  return {
    kind: 'alias',
    of: expr(of),
    name,
  };
}

/**
 * Ascending, in `orderBy`.
 *
 * @example
 * selectFrom('nodes', { orderBy: [asc('line_from')] });
 */
export function asc(of: string | TSqlNode): TOrderNode {
  return {
    kind: 'order',
    of: columnOf(of),
    direction: 'asc',
  };
}

/**
 * Descending, in `orderBy`.
 *
 * @example
 * selectFrom('units', { orderBy: [desc('fan_in')] });
 */
export function desc(of: string | TSqlNode): TOrderNode {
  return {
    kind: 'order',
    of: columnOf(of),
    direction: 'desc',
  };
}

/**
 * A table with an alias, as a source of rows.
 *
 * @example
 * selectFrom(table('units', 'u'), { columns: ['u.id'] }); // SELECT "u"."id" FROM "units" AS "u"
 */
export function table(name: string, as?: string): TTableNode {
  if (typeof name !== 'string' || name === '') {
    throw fail('table', `expects a table's name, got ${describeValue(name)}`);
  }
  return {
    kind: 'table',
    name,
    as,
  };
}

function joinOf(
  type: 'inner' | 'left', left: TFrom, right: TFrom, on: TSqlNode,
): TJoinNode {
  return {
    kind: 'join',
    type,
    left: sourceOf(left),
    right: sourceOf(right),
    on,
  };
}

/**
 * The rows of both sources where `on` holds.
 *
 * @example
 * join(table('units_fts'), table('units', 'u'), eq(col('u.rid'), col('units_fts.rowid')));
 * // "units_fts" JOIN "units" AS "u" ON "u"."rid" = "units_fts"."rowid"
 */
export const join = (
  left: TFrom, right: TFrom, on: TSqlNode,
): TJoinNode => joinOf(
  'inner', left, right, on,
);

/**
 * Every row of `left`, with `right`'s where `on` holds and NULLs where nothing does.
 *
 * @example
 * leftJoin('files', table('units', 'u'), eq(col('u.file'), col('files.path')));
 */
export const leftJoin = (
  left: TFrom, right: TFrom, on: TSqlNode,
): TJoinNode => joinOf(
  'left', left, right, on,
);

/**
 * A `SELECT`. A name in `columns`, `groupBy`, `orderBy` is a column; a number in `limit` / `offset` — a parameter.
 *
 * @param from - A table's name, `table(name, alias)`, or a `join`.
 * @param options - `columns` (every one when left out), `distinct`, `where`, `groupBy`, `having`, `orderBy`, `limit`,
 * `offset`.
 * @example
 * selectFrom('nodes', { columns: ['id', 'heading'], where: eq(col('file'), param('file')), orderBy: [asc('line_from')] });
 * // SELECT "id", "heading" FROM "nodes" WHERE "file" = ? ORDER BY "line_from" ASC
 */
export function selectFrom(from: TFrom, options?: TSelectOptions): TSelectNode {
  checkOptions('selectFrom', options);
  const limit = options?.limit;
  const offset = options?.offset;
  return {
    kind: 'select',
    distinct: options?.distinct === true,
    from: sourceOf(from),
    columns: (options?.columns || []).map(columnOf),
    where: options?.where,
    groupBy: (options?.groupBy || []).map(columnOf),
    having: options?.having,
    orderBy: (options?.orderBy || []).map((term) => (typeof term === 'string' ? asc(term) : term)),
    limit: limit === undefined ? undefined : expr(limit),
    offset: offset === undefined ? undefined : expr(offset),
  };
}

/**
 * An `INSERT` of one row or several; `onConflict` makes it an upsert.
 *
 * @param into - The table.
 * @param options - `values` (column → expression; several rows with the same columns), `onConflict` (`{ target,
 * update }` or `{ target, nothing: true }`), `returning`.
 * @throws {TypeError} no rows; rows with different columns; an upsert with neither `update` nor `nothing`.
 * @example
 * insertInto('files', {
 *   values: { path: param('path'), mtime: param('mtime') },
 *   onConflict: { target: ['path'], update: ['mtime'] },
 * });
 * // INSERT INTO "files" ("path", "mtime") VALUES (?, ?) ON CONFLICT ("path") DO UPDATE SET "mtime" = excluded."mtime"
 */
export function insertInto(into: string, options: TInsertOptions): TInsertNode {
  checkOptions(INSERT_INTO, options);
  const rows = isArray(options.values) ? options.values : [options.values];
  if (rows.length === 0) {
    throw fail(INSERT_INTO, 'no rows in "values"');
  }
  const columns = Object.keys(rows[0]);
  if (columns.length === 0) {
    throw fail(INSERT_INTO, 'a row with no columns');
  }
  const key = columns.join('\u0000');
  for (const row of rows) {
    if (Object.keys(row).join('\u0000') !== key) {
      throw fail(INSERT_INTO, `every row needs the same columns as the first: ${columns.join(', ')}; got ${Object.keys(row).join(', ')}`);
    }
  }
  const onConflict = options.onConflict;
  const updates = onConflict !== undefined && onConflict.update !== undefined && onConflict.update.length > 0;
  if (onConflict && !onConflict.nothing && !updates) {
    throw fail(INSERT_INTO, 'onConflict needs "update" (the columns to take) or "nothing: true"');
  }
  if (updates && (onConflict as TOnConflict).target.length === 0) {
    throw fail(INSERT_INTO, 'onConflict "update" needs a "target" — the columns of the unique key');
  }
  return {
    kind: 'insert',
    into: table(into),
    columns,
    rows: rows.map((row) => columns.map((column) => expr(row[column]))),
    onConflict,
    returning: options.returning || [],
  };
}

/**
 * An `UPDATE`; a column whose value is `undefined` is left out — the reference's `updateMethod`.
 *
 * @param name - The table.
 * @param options - `set`, `where`, `returning`.
 * @throws {TypeError} nothing to set: every value `undefined`.
 * @example
 * update('Projects', { set: { previewPath: '/a.png', openedAt: undefined }, where: eq(col('id'), 7) });
 * // UPDATE "Projects" SET "previewPath" = ? WHERE "id" = ?   params ['/a.png', 7]
 */
export function update(name: string, options: TUpdateOptions): TUpdateNode {
  checkOptions(UPDATE, options);
  const set: [string, TSqlNode][] = [];
  for (const column of Object.keys(options.set)) {
    const value = options.set[column];
    if (value !== undefined) {
      set.push([
        column,
        expr(value),
      ]);
    }
  }
  if (set.length === 0) {
    throw fail(UPDATE, 'nothing to set: every value of "set" is undefined');
  }
  return {
    kind: 'update',
    table: table(name),
    set,
    where: options.where,
    returning: options.returning || [],
  };
}

/**
 * A `DELETE`; without `where` — every row.
 *
 * @example
 * deleteFrom('nodes', { where: eq(col('file'), param('file')) }); // DELETE FROM "nodes" WHERE "file" = ?
 */
export function deleteFrom(from: string, options?: TDeleteOptions): TDeleteNode {
  checkOptions('deleteFrom', options);
  return {
    kind: 'delete',
    from: table(from),
    where: options?.where,
    returning: options?.returning || [],
  };
}
