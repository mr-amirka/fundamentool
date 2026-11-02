import {
  describeValue,
} from '../describeValue';
import {
  isArray,
} from '../is/isArray';
import {
  sqlCompiler,
} from './compiler';
import {
  isSqlNode,
} from './nodes';
import {
  WHERE,
  checkOptions,
} from './options';
import {
  sqlite,
} from './sqlite';
import type {
  TBindValues,
  TCompiled,
  TSqlNode,
  TSqliteAdapter,
  TSqliteAdapterOptions,
  TSqliteDatabasePort,
  TSqliteSession,
  TSqliteStatementPort,
  TStatement,
  TTransactionOptions,
} from './types';

/** A pragma's name: a word in lower case. */
const PRAGMA_NAME = /^[a-z_]+$/;
/** A pragma's value as a word: `wal`, `normal`. */
const PRAGMA_WORD = /^[A-Za-z_][A-Za-z0-9_]*$/;

const ROLLBACK = 'ROLLBACK';
/** An extended code's name LOCKED, CORRUPT and CONSTRAINT share. */
const VTAB = 'VTAB';

const isCompiled = (query: unknown): query is TCompiled => query !== null && typeof query === 'object'
  && typeof (query as TCompiled).text === 'string' && isArray((query as TCompiled).params)
  && isArray((query as TCompiled).names);

/** A session's queue: its operations run one at a time, in the order they were called. */
type TQueue = {
  /** Settles when the last operation called has settled; never rejects. */
  tail: Promise<unknown>;
  /** Operations called and not yet settled. */
  pending: number;
  /** The transaction's function has settled: the session takes nothing more. */
  over: boolean;
  /** 0 — the connection; n — a transaction n deep. */
  depth: number;
};

/** What the adapter keeps of a statement it prepared, for another session to run it. */
type TPrepared = {
  compiled: TCompiled;
  statement: TSqliteStatementPort;
};

const queueOf = (depth: number): TQueue => ({
  tail: Promise.resolve(),
  pending: 0,
  over: false,
  depth,
});

const OVER = `${WHERE} transaction: this transaction is over — its function had settled; run the statement on the session the transaction was opened on`;

/**
 * Runs `operation` in its turn on `queue`: at once when nothing is pending, else after the last one called has settled.
 *
 * @param queue - The session's queue.
 * @param operation - The work; its throw is the promise's rejection.
 * @returns What it returned.
 */
function turn<T>(queue: TQueue, operation: () => T | Promise<T>): Promise<T> {
  const run = (): T | Promise<T> => {
    if (queue.over) {
      throw new Error(OVER);
    }
    return operation();
  };
  const result = queue.pending === 0 ? new Promise<T>((resolve) => resolve(run())) : queue.tail.then(run);
  queue.pending++;
  const settled = (): void => {
    queue.pending--;
  };
  queue.tail = result.then(settled, settled);
  return result;
}

/** Waits until nothing called on `queue` is pending — what a transaction's function left running, before COMMIT. */
async function drain(queue: TQueue): Promise<void> {
  while (queue.pending > 0) {
    await queue.tail;
  }
}

/**
 * A SQLite database behind one async shape (fundamentool D-088, D-093; lab D-046), better-sqlite3's `Database` or
 * `node:sqlite`'s `DatabaseSync`: `prepare(query)` → `all` / `get` / `run` / `iterate` with named values, each a
 * promise; transactions written by the adapter for both, with a session of their own (nested — savepoints); migrations
 * over `PRAGMA user_version`; `pragma` read back; `tableColumns`. The dialect's functions (`fundamentool_lower`,
 * `fundamentool_regexp`) are installed on the instance.
 *
 * The port is async though both drivers are sync, so a driver that waits (a Worker, PostgreSQL) fits under it with no
 * caller changed. The connection runs its operations one at a time: while a transaction is running, other code's
 * statements wait for its COMMIT and never land inside it.
 *
 * A `bigint` above 2⁵³ is rounded by better-sqlite3 without its `safeIntegers` and refused by `node:sqlite` — a driver's
 * setting, not a query's. `node:sqlite`'s rows have a `null` prototype: `in`, spread and `JSON.stringify` work,
 * `row.hasOwnProperty` doesn't.
 *
 * @param instance - The driver's database.
 * @param options - `presets` over `sqlite`: `sqliteFts5`, a project's own.
 * @returns The adapter.
 * @throws {TypeError} not a SQLite database; in development, an unknown option.
 * @example
 * const db = sqliteAdapter(new Database(file), { presets: [sqliteFts5] });
 * await db.pragma('journal_mode', 'wal'); // => 'wal'
 * const ofFile = db.prepare<TNodeRow>(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
 * await ofFile.all({ file: 'PLAN.md' });
 * await db.transaction(async (tx) => {
 *   await tx.prepare(forgetFile).run({ file });
 *   return tx.prepare(ofFile).all({ file }); // the statement prepared on db, run in the transaction
 * }, { immediate: true });
 */
export function sqliteAdapter<I extends TSqliteDatabasePort>(instance: I, options?: TSqliteAdapterOptions): TSqliteAdapter<I> {
  if (instance === null || typeof instance !== 'object' || typeof instance.prepare !== 'function'
    || typeof instance.exec !== 'function' || typeof instance.function !== 'function') {
    throw new TypeError(`${WHERE} sqliteAdapter: expects a SQLite database (better-sqlite3 or node:sqlite), got ${describeValue(instance)}`);
  }
  checkOptions('sqliteAdapter', options);
  const compiler = sqlCompiler({
    presets: [
      sqlite,
      ...options?.presets || [],
    ],
  });
  for (const name of Object.keys(compiler.functions)) {
    instance.function(
      name, {
        deterministic: true,
      }, compiler.functions[name],
    );
  }
  const prepared = new WeakMap<object, TPrepared>();

  const readPragma = (name: string, value: unknown): unknown => {
    if (typeof name !== 'string' || !PRAGMA_NAME.test(name)) {
      throw new TypeError(`${WHERE} pragma: expects a pragma's name — a lower-case word — got ${describeValue(name)}`);
    }
    if (value !== undefined) {
      let text: string;
      if (typeof value === 'number' && Number.isFinite(value)) {
        text = String(value);
      } else if (typeof value === 'boolean') {
        text = value ? '1' : '0';
      } else if (typeof value === 'string' && PRAGMA_WORD.test(value)) {
        text = value;
      } else {
        throw new TypeError(`${WHERE} pragma: "${name}" expects a number, a boolean or a word, got ${describeValue(value)}`);
      }
      instance.exec(`PRAGMA ${name} = ${text}`);
    }
    const row = instance.prepare(`PRAGMA ${name}`).get() as Record<string, unknown> | undefined;
    return row === undefined ? undefined : row[Object.keys(row)[0]];
  };

  /** A transaction on `queue`'s session, in that session's turn: BEGIN or SAVEPOINT, `fn`, COMMIT or ROLLBACK. */
  const runTransaction = async <T>(queue: TQueue, fn: (tx: TSqliteSession<I>) => T | Promise<T>): Promise<T> => {
    const outermost = queue.depth === 0;
    const savepoint = `fundamentool_${queue.depth}`;
    const inner = queueOf(queue.depth + 1);
    const rollback = (): void => {
      try {
        instance.exec(outermost ? ROLLBACK : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
      } catch {
        // SQLite rolled it back itself (a full disk, an interrupt): the error that did it is the one to see.
      }
    };
    let result: T;
    try {
      result = await fn(sessionOf(inner));
      await drain(inner);
    } catch (error) {
      await drain(inner);
      inner.over = true;
      rollback();
      throw error;
    }
    inner.over = true;
    try {
      instance.exec(outermost ? 'COMMIT' : `RELEASE ${savepoint}`);
    } catch (error) {
      rollback();
      throw error;
    }
    return result;
  };

  const begin = (queue: TQueue, transactionOptions: TTransactionOptions | undefined): void => {
    instance.exec(queue.depth > 0 ? `SAVEPOINT fundamentool_${queue.depth}` : transactionOptions?.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN');
  };

  /** The session that runs on `queue`: the connection's, or a transaction's. */
  function sessionOf(queue: TQueue): TSqliteSession<I> {
    return {
      prepare<R>(query: TSqlNode | TCompiled | TStatement<R>): TStatement<R> {
        let entry = prepared.get(query);
        if (entry === undefined) {
          let compiled: TCompiled;
          if (isCompiled(query)) {
            compiled = query;
          } else if (isSqlNode(query)) {
            compiled = compiler.compile(query);
          } else {
            throw new TypeError(`${WHERE} prepare: expects a query node, a compiled query { text, params, names } or a statement of this adapter, got ${describeValue(query)}`);
          }
          entry = {
            compiled,
            statement: instance.prepare(compiled.text),
          };
        }
        const {
          compiled,
          statement,
        } = entry;
        const bind = (values: TBindValues | undefined): unknown[] => compiler.bind(compiled, values);
        const result: TStatement<R> = {
          all: (values) => turn(queue, () => statement.all.apply(statement, bind(values)) as R[]),
          get: (values) => turn(queue, () => statement.get.apply(statement, bind(values)) as R | undefined),
          run: (values) => turn(queue, () => statement.run.apply(statement, bind(values))),
          async* iterate(values) {
            yield* await turn(queue, () => statement.iterate.apply(statement, bind(values)) as IterableIterator<R>);
          },
          text: compiled.text,
        };
        prepared.set(result, entry);
        return result;
      },
      exec: (text) => turn(queue, () => {
        if (typeof text !== 'string') {
          throw new TypeError(`${WHERE} exec: expects SQL text, got ${describeValue(text)}`);
        }
        instance.exec(text);
      }),
      transaction(fn, transactionOptions) {
        try {
          checkOptions('transaction', transactionOptions);
          if (typeof fn !== 'function') {
            throw new TypeError(`${WHERE} transaction: expects a function, got ${describeValue(fn)}`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
        return turn(queue, () => {
          begin(queue, transactionOptions);
          return runTransaction(queue, fn);
        });
      },
      pragma: (name, value) => turn(queue, () => readPragma(name, value)),
      tableColumns: (name) => turn(queue, () => {
        if (typeof name !== 'string' || name === '') {
          throw new TypeError(`${WHERE} tableColumns: expects a table's name, got ${describeValue(name)}`);
        }
        return (instance.prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid').all(name) as {
          name: string;
        }[]).map((row) => row.name);
      }),
      compiler,
      instance,
    };
  }

  const connection = queueOf(0);
  return {
    ...sessionOf(connection),
    migrate: (migrations) => turn(connection, async () => {
      if (!isArray(migrations)) {
        throw new TypeError(`${WHERE} migrate: expects a list of { version, up }, got ${describeValue(migrations)}`);
      }
      let last = 0;
      for (const migration of migrations) {
        const version = migration?.version;
        if (!Number.isInteger(version) || version <= last || typeof migration.up !== 'function') {
          throw new TypeError(`${WHERE} migrate: expects { version, up } with whole versions from 1, ascending and unique; got ${describeValue(migration)} after version ${last}`);
        }
        last = version;
      }
      const from = Number(readPragma('user_version', undefined));
      if (from > last) {
        throw new Error(`${WHERE} migrate: the database is at version ${from}; this code knows up to ${last}`);
      }
      for (const migration of migrations) {
        if (migration.version > from) {
          try {
            begin(connection, {
              immediate: true,
            });
            await runTransaction(connection, async (m) => {
              await migration.up(m);
              await m.exec(`PRAGMA user_version = ${migration.version}`);
            });
          } catch (error) {
            throw new Error(`${WHERE} migrate: version ${migration.version} failed, rolled back: ${error instanceof Error ? error.message : String(error)}`, {
              cause: error,
            });
          }
        }
      }
      return {
        from,
        to: last,
      };
    }),
  };
}

/** SQLite's result codes by number: the primary ones, then each primary's extended ones (`primary | n << 8`, n from 1). */
const PRIMARY = [
  'OK',
  'ERROR',
  'INTERNAL',
  'PERM',
  'ABORT',
  'BUSY',
  'LOCKED',
  'NOMEM',
  'READONLY',
  'INTERRUPT',
  'IOERR',
  'CORRUPT',
  'NOTFOUND',
  'FULL',
  'CANTOPEN',
  'PROTOCOL',
  'EMPTY',
  'SCHEMA',
  'TOOBIG',
  'CONSTRAINT',
  'MISMATCH',
  'MISUSE',
  'NOLFS',
  'AUTH',
  'FORMAT',
  'RANGE',
  'NOTADB',
  'NOTICE',
  'WARNING',
];

const EXTENDED: Readonly<Record<string, readonly string[]>> = {
  ERROR: [
    'MISSING_COLLSEQ',
    'RETRY',
    'SNAPSHOT',
  ],
  ABORT: [
    '',
    ROLLBACK,
  ],
  BUSY: [
    'RECOVERY',
    'SNAPSHOT',
    'TIMEOUT',
  ],
  LOCKED: [
    'SHAREDCACHE',
    VTAB,
  ],
  READONLY: [
    'RECOVERY',
    'CANTLOCK',
    ROLLBACK,
    'DBMOVED',
    'CANTINIT',
    'DIRECTORY',
  ],
  IOERR: [
    'READ',
    'SHORT_READ',
    'WRITE',
    'FSYNC',
    'DIR_FSYNC',
    'TRUNCATE',
    'FSTAT',
    'UNLOCK',
    'RDLOCK',
    'DELETE',
    'BLOCKED',
    'NOMEM',
    'ACCESS',
    'CHECKRESERVEDLOCK',
    'LOCK',
    'CLOSE',
    'DIR_CLOSE',
    'SHMOPEN',
    'SHMSIZE',
    'SHMLOCK',
    'SHMMAP',
    'SEEK',
    'DELETE_NOENT',
    'MMAP',
    'GETTEMPPATH',
    'CONVPATH',
    'VNODE',
    'AUTH',
    'BEGIN_ATOMIC',
    'COMMIT_ATOMIC',
    'ROLLBACK_ATOMIC',
    'DATA',
    'CORRUPTFS',
    'IN_PAGE',
  ],
  CORRUPT: [
    VTAB,
    'SEQUENCE',
    'INDEX',
  ],
  CANTOPEN: [
    'NOTEMPDIR',
    'ISDIR',
    'FULLPATH',
    'CONVPATH',
    'DIRTYWAL',
    'SYMLINK',
  ],
  CONSTRAINT: [
    'CHECK',
    'COMMITHOOK',
    'FOREIGNKEY',
    'FUNCTION',
    'NOTNULL',
    'PRIMARYKEY',
    'TRIGGER',
    'UNIQUE',
    VTAB,
    'ROWID',
    'PINNED',
    'DATATYPE',
  ],
  NOTICE: [
    'RECOVER_WAL',
    'RECOVER_ROLLBACK',
    'RBU',
  ],
  WARNING: ['AUTOINDEX'],
  AUTH: ['USER'],
};

/**
 * SQLite's code of an error, whichever driver threw it: better-sqlite3's `code` as it is (`SQLITE_BUSY`,
 * `SQLITE_CONSTRAINT_PRIMARYKEY`), `node:sqlite`'s `errcode` named the same way.
 *
 * @param error - Anything caught.
 * @returns The code, or `undefined` — not a SQLite error.
 * @example
 * try { db.prepare(insert).run(row); } catch (error) {
 *   if (sqliteErrorCode(error) === 'SQLITE_CONSTRAINT_PRIMARYKEY') { … }
 * }
 */
export function sqliteErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code.startsWith('SQLITE_')) {
    return code;
  }
  const number = (error as { errcode?: unknown }).errcode;
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 0) {
    return undefined;
  }
  const primary = PRIMARY[number & 0xff];
  if (primary === undefined) {
    return undefined;
  }
  const extended = (EXTENDED[primary] || [])[(number >> 8) - 1];
  return `SQLITE_${primary}${extended ? `_${extended}` : ''}`;
}
