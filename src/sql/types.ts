import type {
  TPreset,
  TPresetObject,
} from '../hooks/types';
import type {
  TMatchOperators,
} from '../match/types';

/** A node of a query tree: plain data with a `kind`. A preset may bring kinds of its own. */
export type TSqlNode = {
  readonly kind: string;
  readonly [key: string]: unknown;
};

/** What can stand where an expression goes: a node, or a JS value bound as a parameter. */
export type TSqlValue = string | number | bigint | boolean | null | Uint8Array;

/** An expression: a node, or a value (a parameter). */
export type TSqlExpr = TSqlNode | TSqlValue;

/** A column: `col('u.kind')`. */
export type TColumnNode = {
  readonly kind: 'column';
  readonly name: string;
};

/** A named parameter, bound per call: `param('file')`. */
export type TParamNode = {
  readonly kind: 'param';
  readonly name: string;
};

/** A value bound as a parameter. */
export type TValueNode = {
  readonly kind: 'value';
  readonly value: unknown;
};

/** Trusted SQL text, for what no node writes. */
export type TRawNode = {
  readonly kind: 'raw';
  readonly text: string;
};

/** A function call: `fn('bm25', col('units_fts'), 10, 5)`. */
export type TFnNode = {
  readonly kind: 'fn';
  readonly name: string;
  readonly args: readonly TSqlNode[];
};

/** `and` / `or` of conditions. */
export type TLogicNode = {
  readonly kind: 'and' | 'or';
  readonly of: readonly TSqlNode[];
};

/** `NOT (…)`. */
export type TNotNode = {
  readonly kind: 'not';
  readonly of: TSqlNode;
};

/** The comparison operators. */
export type TCompareOp = '=' | '<>' | '<' | '<=' | '>' | '>=';

/** A comparison of two expressions. */
export type TCompareNode = {
  readonly kind: 'compare';
  readonly op: TCompareOp;
  readonly left: TSqlNode;
  readonly right: TSqlNode;
};

/** `x IN (…)`. */
export type TInNode = {
  readonly kind: 'in';
  readonly of: TSqlNode;
  readonly list: readonly TSqlNode[];
};

/** `x LIKE pattern`. */
export type TLikeNode = {
  readonly kind: 'like';
  readonly of: TSqlNode;
  readonly pattern: TSqlNode;
};

/** `x IS NULL`. */
export type TIsNullNode = {
  readonly kind: 'is-null';
  readonly of: TSqlNode;
};

/** A field inside a JSON column: `jsonGet(col('attrs'), ['status'])`. */
export type TJsonGetNode = {
  readonly kind: 'json-get';
  readonly of: TSqlNode;
  readonly path: readonly string[];
};

/** An expression with a name in a select list: `alias(fn('count', raw('*')), 'n')`. */
export type TAliasNode = {
  readonly kind: 'alias';
  readonly of: TSqlNode;
  readonly name: string;
};

/** An `ORDER BY` term. */
export type TOrderNode = {
  readonly kind: 'order';
  readonly of: TSqlNode;
  readonly direction: 'asc' | 'desc';
};

/** A table, with an alias: `table('units', 'u')`. */
export type TTableNode = {
  readonly kind: 'table';
  readonly name: string;
  readonly as: string | undefined;
};

/** A join of two sources. */
export type TJoinNode = {
  readonly kind: 'join';
  readonly type: 'inner' | 'left';
  readonly left: TSqlNode;
  readonly right: TSqlNode;
  readonly on: TSqlNode;
};

/**
 * The keys of a JSON object as rows, one key each, in a column `key` read through the alias: `jsonKeys(col('n.attrs'),
 * 'j')` beside the table it reads, `col('j.key')`. No standard SQL writes it; each dialect does (`json_each` in SQLite).
 */
export type TJsonKeysNode = {
  readonly kind: 'json-keys';
  readonly of: TSqlNode;
  readonly as: string;
};

/** A source of rows: a table's name, a table with an alias, a join, a JSON object's keys. */
export type TFrom = string | TTableNode | TJoinNode | TJsonKeysNode;

/** `selectFrom`'s options. */
export type TSelectOptions = {
  /** `SELECT DISTINCT`. */
  distinct?: boolean;
  /** The columns: names, expressions, aliases; every column when left out. */
  columns?: readonly (string | TSqlNode)[];
  /** The condition. */
  where?: TSqlNode;
  /** `GROUP BY`. */
  groupBy?: readonly (string | TSqlNode)[];
  /** `HAVING`. */
  having?: TSqlNode;
  /** `ORDER BY`: `asc(…)`, `desc(…)`, or names (ascending). */
  orderBy?: readonly (string | TSqlNode)[];
  /** `LIMIT`: a number or a parameter. */
  limit?: number | TSqlNode;
  /** `OFFSET`: a number or a parameter. */
  offset?: number | TSqlNode;
};

/** A `SELECT`. */
export type TSelectNode = {
  readonly kind: 'select';
  readonly distinct: boolean;
  readonly from: TSqlNode;
  readonly columns: readonly TSqlNode[];
  readonly where: TSqlNode | undefined;
  readonly groupBy: readonly TSqlNode[];
  readonly having: TSqlNode | undefined;
  readonly orderBy: readonly TSqlNode[];
  readonly limit: TSqlNode | undefined;
  readonly offset: TSqlNode | undefined;
};

/** What an insert does on a conflict of `target`: updates the named columns, or nothing. */
export type TOnConflict = {
  /** The columns of the unique key. */
  target: readonly string[];
  /** The columns to take from the new row. */
  update?: readonly string[];
  /** Skip the row (`ON CONFLICT … DO NOTHING`). */
  nothing?: true;
};

/** `insertInto`'s options. */
export type TInsertOptions = {
  /** One row, or several with the same keys: column → expression. */
  values: Readonly<Record<string, TSqlExpr>> | readonly Readonly<Record<string, TSqlExpr>>[];
  /** An upsert. */
  onConflict?: TOnConflict;
  /** `RETURNING` these columns. */
  returning?: readonly string[];
};

/** An `INSERT`. */
export type TInsertNode = {
  readonly kind: 'insert';
  readonly into: TSqlNode;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly TSqlNode[])[];
  readonly onConflict: TOnConflict | undefined;
  readonly returning: readonly string[];
};

/** `update`'s options. */
export type TUpdateOptions = {
  /** Column → expression; a column whose value is `undefined` is left out. */
  set: Readonly<Record<string, TSqlExpr | undefined>>;
  /** The condition. */
  where?: TSqlNode;
  /** `RETURNING` these columns. */
  returning?: readonly string[];
};

/** An `UPDATE`. */
export type TUpdateNode = {
  readonly kind: 'update';
  readonly table: TSqlNode;
  readonly set: readonly (readonly [string, TSqlNode])[];
  readonly where: TSqlNode | undefined;
  readonly returning: readonly string[];
};

/** `deleteFrom`'s options. */
export type TDeleteOptions = {
  /** The condition. */
  where?: TSqlNode;
  /** `RETURNING` these columns. */
  returning?: readonly string[];
};

/** A `DELETE`. */
export type TDeleteNode = {
  readonly kind: 'delete';
  readonly from: TSqlNode;
  readonly where: TSqlNode | undefined;
  readonly returning: readonly string[];
};

/** A compiled query: the text, a value per placeholder, and the name of each named one. */
export type TCompiled = {
  readonly text: string;
  /** In placeholder order; a named slot holds `undefined` until bound. */
  readonly params: readonly unknown[];
  /** In placeholder order: the name of a `param(name)` slot, `undefined` for a value fixed at compile. */
  readonly names: readonly (string | undefined)[];
};

/** What a handler gets to write its node with. */
export type TSqlContext = {
  /** Writes a child node. */
  compile(node: TSqlNode): string;
  /** A placeholder for a value fixed now, bound when the query runs (through the dialect's `value`). */
  param(value: unknown): string;
  /** A placeholder for a named parameter, its value given per call (`bind`). */
  named(name: string): string;
  /** A quoted name. */
  ident(name: string): string;
  /** A constant written into the text — only where a placeholder can't be (a JSON path). */
  literal(value: string | number): string;
  /** Children joined: `c.list(n.of, ' AND ')`. */
  list(nodes: readonly TSqlNode[], separator?: string): string;
  /** The handler this one replaced — with this node, or another. */
  base(node?: TSqlNode): string;
};

/** A handler of a node kind. */
export type TNodeHandler<N extends TSqlNode = any> = (node: N, c: TSqlContext) => string;

/** The primitives a dialect may replace, each with its argument and result. */
export type TPrimitives = {
  /** A placeholder for the parameter at `index`: `?`, `$1`. */
  param: [index: number, result: string];
  /** A quoted name: `"units"`. */
  ident: [name: string, result: string];
  /** A constant in the text: `'$.status'`, `3`. */
  literal: [value: string | number, result: string];
  /** How a value is bound: `true` → `1` in SQLite; a value no driver binds is refused. */
  value: [value: unknown, result: unknown];
};

/** A primitive's handler: `next` is the one it replaced. */
export type TPrimitiveHandler<P extends keyof TPrimitives> = (
  input: TPrimitives[P][0], next: (input?: TPrimitives[P][0]) => TPrimitives[P][1],
) => TPrimitives[P][1];

/** What a dialect preset's `setup` gets. */
export type TDialectHost = {
  /** Adds a handler of a node kind; a later preset's is asked first and reaches this one with `c.base`. */
  node<N extends TSqlNode = any>(kind: string, handler: TNodeHandler<N>): void;
  /** Replaces a primitive. */
  primitive<P extends keyof TPrimitives>(name: P, handler: TPrimitiveHandler<P>): void;
  /** A function the dialect's SQL calls, installed by an adapter on its database. */
  function(name: string, implementation: (...args: any[]) => unknown): void;
};

/** A dialect or a preset over one, with a name: `{ name, requires?, setup(d) }`. */
export type TSqlDialect = TPresetObject<TDialectHost>;

/** A dialect, a preset over one, or a function of the host. */
export type TSqlPreset = TPreset<TDialectHost>;

/** `sqlCompiler`'s options. */
export type TSqlCompilerOptions = {
  /** Dialects and presets over them, in any order: each is set up after those it `requires`. */
  presets?: readonly TSqlPreset[];
};

/** A compiler: a query tree → text and parameters, by its presets. */
export type TSqlCompiler = {
  /** Writes a query. */
  compile(node: TSqlNode): TCompiled;
  /** The parameters to run a compiled query with: the named ones from `values`, each through the dialect's `value`. */
  bind(compiled: TCompiled, values?: Readonly<Record<string, unknown>>): unknown[];
  /** A quoted name, for SQL text written by hand (a schema). */
  ident(name: string): string;
  /** The functions the dialect's SQL calls, by name. */
  readonly functions: Readonly<Record<string, (...args: any[]) => unknown>>;
};

/** An operator of a match pattern, for a dialect to write: `{ kind: 'match:$eq', path, field, argument }`. */
export type TMatchOpNode = {
  readonly kind: `match:${string}`;
  /** The field's path in the pattern — for messages. */
  readonly path: readonly string[];
  /** Where the field lives: what `matchWhere`'s `field(path)` returned. */
  readonly field: TSqlNode;
  /** The operator's argument, as the pattern gave it. */
  readonly argument: unknown;
};

/** `matchWhere`'s options. */
export type TMatchWhereOptions = {
  /** Where a field of the pattern lives: `col('file')`, `jsonGet(col('attrs'), path)`; `undefined` — an unknown field. */
  field: (path: readonly string[]) => TSqlNode | undefined;
  /** The operators the pattern may use, as `fundamentool/match`'s; a custom one needs a dialect's `match:$name` node. */
  operators?: TMatchOperators;
};

/** `fts5Query`'s options. */
export type TFts5QueryOptions = {
  /** `true` — `"word"*`, words starting so; `'both'` — `("word" OR "word"*)`, an exact word ranked above a prefix. */
  prefix?: boolean | 'both';
};

/** `fts5Phrase`'s options. */
export type TFts5PhraseOptions = {
  /** `true` — `"in foc"*`, the last word a prefix: the phrase as typed so far. */
  prefix?: boolean;
};

/** What a run of a writing statement did. */
export type TRunResult = {
  /** Rows changed. */
  changes: number | bigint;
  /** The rowid of the last row inserted. */
  lastInsertRowid: number | bigint;
};

/** A statement of a SQLite driver, as both better-sqlite3 and `node:sqlite` have it. */
export type TSqliteStatementPort = {
  run(...params: any[]): TRunResult;
  get(...params: any[]): unknown;
  all(...params: any[]): unknown[];
  iterate(...params: any[]): Iterator<unknown> & Iterable<unknown>;
};

/** A SQLite database, as both better-sqlite3's `Database` and `node:sqlite`'s `DatabaseSync` have it. */
export type TSqliteDatabasePort = {
  prepare(text: string): TSqliteStatementPort;
  exec(text: string): unknown;
  function(name: string, options: { deterministic?: boolean }, implementation: (...args: any[]) => unknown): unknown;
};

/** The values of a statement's named parameters: `{ file }` for `param('file')`. */
export type TBindValues = Readonly<Record<string, unknown>>;

/**
 * A prepared statement: compiled and prepared once, run with named values. Each run takes its turn on the session that
 * prepared it (fundamentool D-093): it waits while a transaction opened there is running.
 */
export type TStatement<R> = {
  /** Every row. */
  all(values?: TBindValues): Promise<R[]>;
  /** The first row; `undefined` — none. */
  get(values?: TBindValues): Promise<R | undefined>;
  /** Runs a writing statement. */
  run(values?: TBindValues): Promise<TRunResult>;
  /**
   * The rows one by one. It waits for its turn to start, then streams without holding the session: better-sqlite3
   * refuses another statement on the connection until the loop ends; `node:sqlite` runs it.
   */
  iterate(values?: TBindValues): AsyncIterableIterator<R>;
  /** The SQL text. */
  readonly text: string;
};

/** `transaction`'s options. */
export type TTransactionOptions = {
  /** `BEGIN IMMEDIATE`: the write lock now, not at the first write — a writer that reads first. The outermost decides. */
  immediate?: boolean;
};

/** A version of a schema: what moves the database from the previous one to it. */
export type TMigration<I = unknown> = {
  /** A whole number from 1, ascending in the list. */
  version: number;
  /** The change, in its own transaction: `m` is that transaction's session. */
  up(m: TSqliteSession<I>): void | Promise<void>;
};

/** `sqliteAdapter`'s options. */
export type TSqliteAdapterOptions = {
  /** Presets over `sqlite` (`sqliteFts5`, a project's own). */
  presets?: readonly TSqlPreset[];
};

/**
 * Where statements run: the connection itself, or a transaction opened on it (fundamentool D-093). A session runs its
 * operations one at a time, in the order they were called; while a transaction opened on it is running, they wait.
 */
export type TSqliteSession<I = unknown> = {
  /**
   * Compiles a query (a node, or an already compiled one) and prepares it — once; or takes a statement this adapter
   * prepared on another session and runs it on this one, with nothing compiled or prepared again.
   */
  prepare<R = Record<string, unknown>>(query: TSqlNode | TCompiled | TStatement<R>): TStatement<R>;
  /** Runs SQL text: a schema, statements with no parameters. */
  exec(text: string): Promise<void>;
  /**
   * Runs `fn` in a transaction: committed when it settles, rolled back when it rejects or throws; nested — a savepoint.
   * `fn` gets the transaction's session and runs its statements through it: a statement run on the outer session
   * waits for the transaction to end, and the transaction waits for it — so it never settles.
   */
  transaction<T>(fn: (tx: TSqliteSession<I>) => T | Promise<T>, options?: TTransactionOptions): Promise<T>;
  /** Reads a pragma, or sets it and reads it back. */
  pragma(name: string, value?: number | boolean | string): Promise<unknown>;
  /** A table's columns in order; `[]` — no such table. */
  tableColumns(table: string): Promise<string[]>;
  /** The compiler the adapter compiles with: `compile`, `bind`, `ident`. */
  readonly compiler: TSqlCompiler;
  /** The driver's own object. */
  readonly instance: I;
};

/** A SQLite database behind one shape, whichever the driver: its connection's session, and migrations. */
export type TSqliteAdapter<I = unknown> = TSqliteSession<I> & {
  /** Brings the schema up to the last version, each in its own transaction; the version kept in `PRAGMA user_version`. */
  migrate(migrations: readonly TMigration<I>[]): Promise<{ from: number;
    to: number; }>;
};
