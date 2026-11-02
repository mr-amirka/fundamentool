import {
  describeValue,
} from '../describeValue';
import {
  WHERE,
} from './options';
import type {
  TAliasNode,
  TColumnNode,
  TCompareNode,
  TDeleteNode,
  TFnNode,
  TInNode,
  TInsertNode,
  TIsNullNode,
  TJoinNode,
  TLikeNode,
  TLogicNode,
  TNodeHandler,
  TNotNode,
  TOrderNode,
  TParamNode,
  TRawNode,
  TSelectNode,
  TSqlContext,
  TSqlNode,
  TTableNode,
  TUpdateNode,
  TValueNode,
} from './types';

// The forms SQLite and PostgreSQL share (fundamentool D-088, card §4.3, choice P2): `LIMIT`, `ON CONFLICT`,
// `RETURNING`, `"` quoting. A dialect replaces a node with `d.node(kind, …)` and reaches these through `c.base()`.

/** Kinds written tightly enough to stand in `AND` / `OR` without parentheses. */
const TIGHT = new Set([
  'compare',
  'in',
  'like',
  'is-null',
  'not',
  'fn',
  'column',
  'param',
  'value',
]);

/** Kinds written loosely enough to need parentheses as an operand of a comparison. */
const LOOSE = new Set([
  'and',
  'or',
  'not',
  'compare',
  'in',
  'like',
  'is-null',
  'select',
]);

const TRUE = '1 = 1';
/** Every column. */
const STAR = '*';
/** Between the items of a list. */
const COMMA = ', ';
const FALSE = '1 = 0';

const condition = (node: TSqlNode, c: TSqlContext): string => (TIGHT.has(node.kind)
  ? c.compile(node) : `(${c.compile(node)})`);

const operand = (node: TSqlNode, c: TSqlContext): string => (LOOSE.has(node.kind)
  ? `(${c.compile(node)})` : c.compile(node));

/** A dotted name, each part quoted; `*` as is. */
const dotted = (name: string, c: TSqlContext): string => name.split('.')
  .map((part) => (part === STAR ? part : c.ident(part)))
  .join('.');

const names = (list: readonly string[], c: TSqlContext): string => list.map((name) => (name === STAR
  ? name : c.ident(name))).join(COMMA);

const returning = (list: readonly string[], c: TSqlContext): string => (list.length > 0
  ? ` RETURNING ${names(list, c)}` : '');

const where = (node: TSqlNode | undefined, c: TSqlContext): string => (node ? ` WHERE ${c.compile(node)}` : '');

function logic(word: string, empty: string): TNodeHandler<TLogicNode> {
  return (node, c) => {
    const of = node.of;
    if (of.length === 0) {
      return empty;
    }
    if (of.length === 1) {
      return c.compile(of[0]);
    }
    return of.map((child) => condition(child, c)).join(word);
  };
}

/** The handlers the base writes, by node kind — the end of each kind's chain. */
export const BASE_NODES: Readonly<Record<string, TNodeHandler>> = {
  column: (node: TColumnNode, c) => dotted(node.name, c),
  param: (node: TParamNode, c) => c.named(node.name),
  value: (node: TValueNode, c) => c.param(node.value),
  raw: (node: TRawNode) => node.text,
  fn: (node: TFnNode, c) => `${node.name}(${c.list(node.args)})`,
  and: logic(' AND ', TRUE),
  or: logic(' OR ', FALSE),
  not: (node: TNotNode, c) => `NOT (${c.compile(node.of)})`,
  compare: (node: TCompareNode, c) => `${operand(node.left, c)} ${node.op} ${operand(node.right, c)}`,
  in: (node: TInNode, c) => (node.list.length === 0 ? FALSE : `${operand(node.of, c)} IN (${c.list(node.list)})`),
  like: (node: TLikeNode, c) => `${operand(node.of, c)} LIKE ${operand(node.pattern, c)}`,
  'is-null': (node: TIsNullNode, c) => `${operand(node.of, c)} IS NULL`,
  alias: (node: TAliasNode, c) => `${c.compile(node.of)} AS ${c.ident(node.name)}`,
  order: (node: TOrderNode, c) => `${c.compile(node.of)} ${node.direction === 'desc' ? 'DESC' : 'ASC'}`,
  table: (node: TTableNode, c) => (node.as === undefined ? dotted(node.name, c) : `${dotted(node.name, c)} AS ${c.ident(node.as)}`),
  join: (node: TJoinNode, c) => `${c.compile(node.left)} ${node.type === 'left' ? 'LEFT JOIN' : 'JOIN'} ${c.compile(node.right)} ON ${c.compile(node.on)}`,
  select: (node: TSelectNode, c) => {
    let text = `SELECT ${node.distinct ? 'DISTINCT ' : ''}${node.columns.length > 0 ? c.list(node.columns) : STAR} FROM ${c.compile(node.from)}`;
    text += where(node.where, c);
    if (node.groupBy.length > 0) {
      text += ` GROUP BY ${c.list(node.groupBy)}`;
    }
    if (node.having) {
      text += ` HAVING ${c.compile(node.having)}`;
    }
    if (node.orderBy.length > 0) {
      text += ` ORDER BY ${c.list(node.orderBy)}`;
    }
    if (node.limit) {
      text += ` LIMIT ${c.compile(node.limit)}`;
    }
    if (node.offset) {
      text += ` OFFSET ${c.compile(node.offset)}`;
    }
    return text;
  },
  insert: (node: TInsertNode, c) => {
    let text = `INSERT INTO ${c.compile(node.into)} (${names(node.columns, c)}) VALUES ${node.rows.map((row) => `(${c.list(row)})`).join(COMMA)}`;
    const conflict = node.onConflict;
    if (conflict) {
      text += ` ON CONFLICT${conflict.target.length > 0 ? ` (${names(conflict.target, c)})` : ''}`;
      const columns = conflict.nothing ? undefined : conflict.update;
      text += columns && columns.length > 0
        ? ` DO UPDATE SET ${columns.map((column) => `${c.ident(column)} = excluded.${c.ident(column)}`).join(COMMA)}`
        : ' DO NOTHING';
    }
    return text + returning(node.returning, c);
  },
  update: (node: TUpdateNode, c) => `UPDATE ${c.compile(node.table)} SET ${node.set.map((entry) => `${c.ident(entry[0])} = ${c.compile(entry[1])}`).join(COMMA)}${where(node.where, c)}${returning(node.returning, c)}`,
  delete: (node: TDeleteNode, c) => `DELETE FROM ${c.compile(node.from)}${where(node.where, c)}${returning(node.returning, c)}`,
};

/** A placeholder: `?`. */
export const baseParam = (): string => '?';

/** A quoted name: `"` doubled. */
export function baseIdent(name: string): string {
  if (typeof name !== 'string' || name === '') {
    throw new TypeError(`${WHERE} ident: expects a name, got ${describeValue(name)}`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}

/** A constant in the text: a string quoted (`'` doubled), a finite number as is. */
export function baseLiteral(value: string | number): string {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, '\'\'')}'`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  throw new TypeError(`${WHERE} literal: expects a string or a finite number, got ${describeValue(value)}`);
}

/**
 * A value as bound: what the drivers bind passes; a `Date` and `undefined` are refused with the ways to pass them
 * (card §4.1, choice P4).
 */
export function baseValue(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    || typeof value === 'boolean' || value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof Date) {
    throw new TypeError(`${WHERE} value: a Date can't be bound — pass date.getTime() or date.toISOString(), as the column stores it`);
  }
  if (value === undefined) {
    throw new TypeError(`${WHERE} value: undefined can't be bound — leave the column out, or pass null`);
  }
  throw new TypeError(`${WHERE} value: can't bind ${describeValue(value)} — a string, a number, a bigint, a boolean, null or a Uint8Array`);
}
