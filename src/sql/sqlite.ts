import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  atPath,
} from '../match/normalizeMatch';
import {
  MATCH_KIND,
} from './compiler';
import {
  col,
  isSqlNode,
  raw,
  valueNode,
} from './nodes';
import {
  WHERE,
  checkOptions,
} from './options';
import type {
  TDialectHost,
  TFts5PhraseOptions,
  TFts5QueryOptions,
  TJsonGetNode,
  TJsonKeysNode,
  TMatchOpNode,
  TSelectNode,
  TSqlContext,
  TSqlExpr,
  TSqlDialect,
  TSqlNode,
} from './types';

/** A key written bare in a JSON path; any other is quoted. */
const BARE_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * A JSON path for `json_extract`: `$.status`, `$."my key"`; `[]` — `$`.
 *
 * @throws {TypeError} a key with `"` — SQLite's paths can't hold one.
 */
export function jsonPath(path: readonly string[]): string {
  let text = '$';
  for (const key of path) {
    if (BARE_KEY.test(key)) {
      text += `.${key}`;
    } else if (key.includes('"')) {
      throw new TypeError(`${WHERE} jsonGet: a key with " can't be in a SQLite JSON path: ${describeValue(key)}`);
    } else {
      text += `."${key}"`;
    }
  }
  return text;
}

/** How an operator reads the value it tests: the value at the field, or an element of an array there. */
type TTarget = {
  /** The value's type: `json_type`'s names — `typeof`'s for a column (`text`, `integer`, `real`, `null`). */
  type(): string;
  /** The value. */
  value(): string;
  /** The value is absent. */
  absent(): string;
  /** The value is `null`. */
  isNull(): string;
  /** A JSON value (it has booleans, arrays and objects), or a column's. */
  json: boolean;
};

/** An element of an array, in `json_each`. */
const ELEMENT: TTarget = {
  type: () => 'je.type',
  value: () => 'je.value',
  absent: () => NEVER,
  isNull: () => 'je.type IS \'null\'',
  json: true,
};

const NUMBER_TYPES = '(\'integer\', \'real\')';
const TEXT_TYPE = '(\'text\')';
/** A leaf that never holds. */
const NEVER = '0';
const NULL = 'null';
const COMMA = ', ';
const OR = ' OR ';

/** A two-valued leaf: `test` where the value's type is one of `types`, false elsewhere — absent too. */
const guarded = (
  target: TTarget, types: string, test: () => string,
): string => `CASE WHEN ${target.type()} IN ${types} THEN ${test()} ELSE 0 END`;

/** Whether the argument is a value SQL compares; the reason it isn't, for the message. */
function refusal(argument: unknown, target: TTarget): string | undefined {
  if (argument instanceof Date) {
    return 'a Date can\'t be compared in SQL — pass what the field stores: date.getTime() or date.toISOString()';
  }
  if (typeof argument === 'bigint') {
    return 'a bigint can\'t be compared in SQL — pass a number';
  }
  if (typeof argument === 'number' && argument !== argument) {
    return 'NaN is never stored in JSON or SQL';
  }
  if (typeof argument === 'boolean' && !target.json) {
    return 'a column has no booleans — compare with 1 or 0, as it stores them';
  }
  if (argument !== null && typeof argument === 'object') {
    return `SQL compares whole scalars only, got ${describeValue(argument)}; a nested pattern ({ a: { b: 1 } }) reaches inside`;
  }
  if (typeof argument === 'function' || typeof argument === 'symbol') {
    return `can't compare with ${describeValue(argument)}`;
  }
  return undefined;
}

/** The writers of one operator node. */
type TOp = {
  node: TMatchOpNode;
  c: TSqlContext;
};

function refuse(op: TOp, text: string): never {
  throw new TypeError(`"${op.node.kind.slice(MATCH_KIND.length)}" ${atPath(op.node.path)}: ${text}`);
}

/** Equal to a scalar, as `$eq` (one value; an array's elements by `elementwise`). */
function equals(
  op: TOp, target: TTarget, argument: unknown,
): string {
  const problem = refusal(argument, target);
  if (problem !== undefined) {
    refuse(op, problem);
  }
  if (argument === undefined) {
    return target.absent();
  }
  if (argument === null) {
    return target.isNull();
  }
  if (typeof argument === 'boolean') {
    return `${target.type()} IS '${argument}'`;
  }
  const types = typeof argument === 'string' ? TEXT_TYPE : NUMBER_TYPES;
  return guarded(
    target, types, () => `${target.value()} = ${op.c.param(argument)}`,
  );
}

/** Where the field lives, as targets: its value, and whether it can hold an array. */
function fieldTarget(op: TOp): TTarget {
  const field = op.node.field;
  const c = op.c;
  if (field.kind === 'json-get') {
    const json = field as unknown as TJsonGetNode;
    const at = (name: string) => (): string => `${name}(${c.compile(json.of)}, ${c.literal(jsonPath(json.path))})`;
    const type = at('json_type');
    return {
      type,
      value: at('json_extract'),
      absent: () => `${type()} IS NULL`,
      isNull: () => `${type()} IS 'null'`,
      json: true,
    };
  }
  const value = (): string => c.compile(field);
  return {
    type: () => `typeof(${value()})`,
    value,
    absent: () => `${value()} IS NULL`,
    isNull: () => `${value()} IS NULL`,
    json: false,
  };
}

/** A test of the value — or, on a JSON array, of any of its elements (one level), as `match` reads an array. */
function elementwise(op: TOp, test: (target: TTarget) => string): string {
  const target = fieldTarget(op);
  if (!target.json) {
    return test(target);
  }
  const json = op.node.field as unknown as TJsonGetNode;
  const c = op.c;
  return `CASE WHEN ${target.type()} = 'array' THEN EXISTS (SELECT 1 FROM json_each(${c.compile(json.of)}, ${c.literal(jsonPath(json.path))}) AS je WHERE ${test(ELEMENT)}) ELSE ${test(target)} END`;
}

/** An operator node's handler from its writer. */
const handler = (write: (op: TOp) => string) => (node: TMatchOpNode, c: TSqlContext): string => write({
  node,
  c,
});

function inList(op: TOp): string {
  const list = op.node.argument as readonly unknown[];
  if (list.length === 0) {
    return NEVER;
  }
  for (const item of list) {
    const problem = refusal(item, ELEMENT);
    if (problem !== undefined) {
      refuse(op, problem);
    }
  }
  return elementwise(op, (target) => {
    const parts: string[] = [];
    const strings = list.filter((item) => typeof item === 'string');
    const numbers = list.filter((item) => typeof item === 'number');
    if (strings.length > 0) {
      parts.push(guarded(
        target, TEXT_TYPE, () => `${target.value()} IN (${strings.map((item) => op.c.param(item)).join(COMMA)})`,
      ));
    }
    if (numbers.length > 0) {
      parts.push(guarded(
        target, NUMBER_TYPES, () => `${target.value()} IN (${numbers.map((item) => op.c.param(item)).join(COMMA)})`,
      ));
    }
    for (const item of list) {
      if (typeof item !== 'string' && typeof item !== 'number') {
        parts.push(equals(
          op, target, item,
        ));
      }
    }
    return parts.join(OR);
  });
}

function ordered(sign: string) {
  return (op: TOp): string => {
    const argument = op.node.argument;
    const problem = refusal(argument, ELEMENT);
    if (problem !== undefined) {
      refuse(op, problem);
    }
    const types = typeof argument === 'string' ? TEXT_TYPE : NUMBER_TYPES;
    return elementwise(op, (target) => guarded(
      target, types, () => `${target.value()} ${sign} ${op.c.param(argument)}`,
    ));
  };
}

function has(op: TOp): string {
  const argument = op.node.argument;
  if (typeof argument !== 'string') {
    return elementwise(op, (target) => equals(
      op, target, argument,
    ));
  }
  return elementwise(op, (target) => guarded(
    target, TEXT_TYPE, () => `instr(fundamentool_lower(${target.value()}), ${op.c.param(argument.toLowerCase())}) > 0`,
  ));
}

function regex(op: TOp): string {
  const argument = op.node.argument as RegExp | readonly [string, string?];
  const source = argument instanceof RegExp ? argument.source : argument[0];
  const flags = (argument instanceof RegExp ? argument.flags : argument[1] || '').replace(/[gy]/g, '');
  return elementwise(op, (target) => guarded(
    target, TEXT_TYPE, () => `fundamentool_regexp(${target.value()}, ${op.c.param(source)}, ${op.c.param(flags)})`,
  ));
}

/** `$type`'s names → JSON's types and a column's; `undefined` — absent. */
const JSON_TYPES: Readonly<Record<string, readonly string[]>> = {
  string: ['text'],
  number: [
    'integer',
    'real',
  ],
  boolean: [
    'true',
    'false',
  ],
  null: [NULL],
  array: ['array'],
  object: ['object'],
};

const COLUMN_TYPES: Readonly<Record<string, readonly string[]>> = {
  string: ['text'],
  number: [
    'integer',
    'real',
  ],
  null: [NULL],
  undefined: [NULL],
  // A blob is read as a Uint8Array (a Buffer) — an object to `matchTypeOf`.
  object: ['blob'],
};

function typeOf(op: TOp): string {
  const argument = op.node.argument;
  const names: readonly string[] = isArray(argument) ? argument : [argument as string];
  const target = fieldTarget(op);
  const map = target.json ? JSON_TYPES : COLUMN_TYPES;
  const types: string[] = [];
  let absent = false;
  for (const name of names) {
    const boolean = name === 'boolean';
    if (!target.json && (boolean || name === 'bigint')) {
      refuse(op, boolean
        ? 'a column has no booleans — compare with 1 or 0, as it stores them'
        : 'a column\'s integer is read as a number or a bigint by the driver\'s settings — test "number"');
    }
    if (target.json && name === 'undefined') {
      absent = true;
    }
    for (const sqlType of map[name] || []) {
      if (!types.includes(sqlType)) {
        types.push(sqlType);
      }
    }
  }
  const parts: string[] = [];
  if (types.length > 0) {
    parts.push(`coalesce(${target.type()}, '') IN (${types.map((name) => `'${name}'`).join(COMMA)})`);
  }
  if (absent) {
    parts.push(target.absent());
  }
  return parts.length > 0 ? parts.join(OR) : NEVER;
}

function exists(op: TOp): string {
  const target = fieldTarget(op);
  return target.json ? `${target.type()} IS NOT NULL` : `${target.value()} IS NOT NULL`;
}

/** Lowered as JS lowers — Cyrillic too; SQLite's `lower` is ASCII only. */
function fundamentoolLower(value: unknown): unknown {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

/** The RegExps `fundamentool_regexp` was called with, by flags and source: compiled once, not per row. */
const REGEXPS = new Map<string, RegExp>();
const REGEXPS_KEPT = 64;

/** Whether a JS RegExp finds something in `value`: 1 or 0. */
function fundamentoolRegexp(
  value: unknown, source: string, flags: string,
): number {
  if (typeof value !== 'string') {
    return 0;
  }
  const key = `${flags}/${source}`;
  let regexp = REGEXPS.get(key);
  if (regexp === undefined) {
    if (REGEXPS.size >= REGEXPS_KEPT) {
      REGEXPS.clear();
    }
    regexp = new RegExp(source, flags);
    REGEXPS.set(key, regexp);
  }
  return regexp.test(value) ? 1 : 0;
}

/**
 * SQLite as a dialect (fundamentool D-088): booleans bound as `1` / `0`, `json_extract` for `jsonGet`, `json_each` for `jsonKeys`, `LIMIT -1` before
 * an `OFFSET` alone, and `match`'s standard operators written with their meaning kept (card §4.2) — the functions
 * `fundamentool_lower` and `fundamentool_regexp` they call are in `compiler.functions`, installed by `sqliteAdapter`.
 *
 * @example
 * sqlCompiler({ presets: [sqlite] }).compile(selectFrom('nodes', { where: eq(jsonGet(col('attrs'), ['status']), 'proposed') }));
 * // { text: 'SELECT * FROM "nodes" WHERE json_extract("attrs", \'$.status\') = ?', params: ['proposed'], names: [undefined] }
 */
export const sqlite: TSqlDialect = {
  name: 'sqlite',
  setup(d: TDialectHost) {
    d.primitive('value', (value, next) => (typeof value === 'boolean' ? Number(value) : next()));
    d.node('json-get', (node: TJsonGetNode, c) => `json_extract(${c.compile(node.of)}, ${c.literal(jsonPath(node.path))})`);
    d.node('json-keys', (node: TJsonKeysNode, c) => {
      const of = c.compile(node.of);
      // An array's indexes aren't keys: a value not an object reads as no rows.
      return `json_each(CASE WHEN json_type(${of}) = 'object' THEN ${of} END) AS ${c.ident(node.as)}`;
    });
    d.node('select', (node: TSelectNode, c) => (node.offset !== undefined && node.limit === undefined
      ? c.base({
        ...node,
        limit: raw('-1'),
      })
      : c.base()));
    d.node('match:$eq', handler((op) => elementwise(op, (target) => equals(
      op, target, op.node.argument,
    ))));
    d.node('match:$in', handler(inList));
    d.node('match:$gt', handler(ordered('>')));
    d.node('match:$gte', handler(ordered('>=')));
    d.node('match:$lt', handler(ordered('<')));
    d.node('match:$lte', handler(ordered('<=')));
    d.node('match:$has', handler(has));
    d.node('match:$regex', handler(regex));
    d.node('match:$exists', handler(exists));
    d.node('match:$type', handler(typeOf));
    d.function('fundamentool_lower', fundamentoolLower);
    d.function('fundamentool_regexp', fundamentoolRegexp);
  },
};

/**
 * FTS5's full-text match, over `sqlite`: `textMatch('units_fts', fts5Query(words))` → `"units_fts" MATCH ?`.
 *
 * @example
 * sqlCompiler({ presets: [sqlite, sqliteFts5] });
 */
export const sqliteFts5: TSqlDialect = {
  name: 'sqliteFts5',
  requires: ['sqlite'],
  setup(d: TDialectHost) {
    d.node('text-match', (node: TSqlNode, c) => `${c.compile(node.of as TSqlNode)} MATCH ${c.compile(node.query as TSqlNode)}`);
  },
};

/**
 * A full-text match of an FTS5 table — a node `sqliteFts5` writes.
 *
 * @param of - The FTS5 table (its name, or a column node).
 * @param query - FTS5's query text, `fts5Query(words)` — a parameter.
 * @example
 * selectFrom('units_fts', { where: textMatch('units_fts', fts5Query(['edit', 'distance'], { prefix: 'both' })) });
 */
export function textMatch(of: string | TSqlNode, query: TSqlExpr): TSqlNode {
  return {
    kind: 'text-match',
    of: typeof of === 'string' ? col(of) : of,
    query: isSqlNode(query) ? query : valueNode(query),
  };
}

/**
 * FTS5's query text from words: each quoted (`"` doubled, so no word is read as syntax), `OR` between them.
 *
 * @param words - The words; empty ones are left out.
 * @param options - `prefix`: `true` — `"word"*`; `'both'` — `("word" OR "word"*)`, which BM25 ranks an exact word above
 * a prefix by (the catalog's form).
 * @returns The text, bound as a parameter of `textMatch`.
 * @throws {TypeError} no word.
 * @example
 * fts5Query(['edit', 'dist"ance'], { prefix: true }); // => '"edit"* OR "dist""ance"*'
 */
export function fts5Query(words: readonly string[], options?: TFts5QueryOptions): string {
  checkOptions('fts5Query', options);
  const prefix = options?.prefix;
  const terms: string[] = [];
  for (const word of words) {
    if (typeof word !== 'string') {
      throw new TypeError(`${WHERE} fts5Query: expects words, got ${describeValue(word)}`);
    }
    if (word !== '') {
      const quoted = `"${word.replace(/"/g, '""')}"`;
      terms.push(prefix === 'both' ? `(${quoted} OR ${quoted}*)` : prefix ? `${quoted}*` : quoted);
    }
  }
  if (terms.length === 0) {
    throw new TypeError(`${WHERE} fts5Query: no words — FTS5 can't match an empty query`);
  }
  return terms.join(OR);
}

/**
 * FTS5's query text for a phrase: its words in order, one quoted string (`"` doubled) — the rows holding them adjacent,
 * as the table's tokenizer splits them (`"in focus"` holds "in-focus" under `unicode61`).
 *
 * @param words - The phrase's words, in order; empty ones are left out.
 * @param options - `prefix`: `true` — `"in foc"*`, its last word a prefix.
 * @returns The text, bound as a parameter of `textMatch`.
 * @throws {TypeError} no word.
 * @example
 * fts5Phrase(['in', 'focus']); // => '"in focus"'
 * fts5Phrase(['в', 'фокус'], { prefix: true }); // => '"в фокус"*'
 */
export function fts5Phrase(words: readonly string[], options?: TFts5PhraseOptions): string {
  checkOptions('fts5Phrase', options);
  const kept: string[] = [];
  for (const word of words) {
    if (typeof word !== 'string') {
      throw new TypeError(`${WHERE} fts5Phrase: expects words, got ${describeValue(word)}`);
    }
    if (word !== '') {
      kept.push(word.replace(/"/g, '""'));
    }
  }
  if (kept.length === 0) {
    throw new TypeError(`${WHERE} fts5Phrase: no words — FTS5 can't match an empty phrase`);
  }
  return `"${kept.join(' ')}"${options?.prefix ? '*' : ''}`;
}
