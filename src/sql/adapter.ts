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
  TMigration,
  TSqlNode,
  TSqliteAdapter,
  TSqliteAdapterOptions,
  TSqliteDatabasePort,
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

const isPromise = (value: unknown): boolean => value !== null && (typeof value === 'object' || typeof value === 'function')
  && typeof (value as { then?: unknown }).then === 'function';

/**
 * A SQLite database behind one shape (fundamentool D-088, card §4.4), better-sqlite3's `Database` or `node:sqlite`'s
 * `DatabaseSync`: `prepare(query)` → `all` / `get` / `run` / `iterate` with named values; transactions written by the
 * adapter for both (nested — savepoints); migrations over `PRAGMA user_version`; `pragma` read back; `tableColumns`.
 * The dialect's functions (`fundamentool_lower`, `fundamentool_regexp`) are installed on the instance.
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
 * db.pragma('journal_mode', 'wal'); // => 'wal'
 * const ofFile = db.prepare<TNodeRow>(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
 * ofFile.all({ file: 'PLAN.md' });
 * db.transaction(() => db.prepare(forgetFile).run({ file }), { immediate: true });
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
  let depth = 0;

  const adapter: TSqliteAdapter<I> = {
    prepare<R>(query: TSqlNode | TCompiled): TStatement<R> {
      let compiled: TCompiled;
      if (isCompiled(query)) {
        compiled = query;
      } else if (isSqlNode(query)) {
        compiled = compiler.compile(query);
      } else {
        throw new TypeError(`${WHERE} prepare: expects a query node or a compiled query { text, params, names }, got ${describeValue(query)}`);
      }
      const statement = instance.prepare(compiled.text);
      const bind = (values: TBindValues | undefined): unknown[] => compiler.bind(compiled, values);
      return {
        all: (values) => statement.all.apply(statement, bind(values)) as R[],
        get: (values) => statement.get.apply(statement, bind(values)) as R | undefined,
        run: (values) => statement.run.apply(statement, bind(values)),
        iterate: (values) => statement.iterate.apply(statement, bind(values)) as IterableIterator<R>,
        text: compiled.text,
      };
    },
    exec(text) {
      if (typeof text !== 'string') {
        throw new TypeError(`${WHERE} exec: expects SQL text, got ${describeValue(text)}`);
      }
      instance.exec(text);
    },
    transaction<T>(fn: () => T, transactionOptions?: TTransactionOptions): T {
      checkOptions('transaction', transactionOptions);
      if (typeof fn !== 'function') {
        throw new TypeError(`${WHERE} transaction: expects a function, got ${describeValue(fn)}`);
      }
      const savepoint = `fundamentool_${depth}`;
      const outermost = depth === 0;
      instance.exec(outermost ? transactionOptions?.immediate ? 'BEGIN IMMEDIATE' : 'BEGIN' : `SAVEPOINT ${savepoint}`);
      depth++;
      const rollback = (): void => {
        try {
          instance.exec(outermost ? ROLLBACK : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
        } catch {
          // SQLite rolled it back itself (a full disk, an interrupt): the error that did it is the one to see.
        }
      };
      let result: T;
      try {
        result = fn();
      } catch (error) {
        depth--;
        rollback();
        throw error;
      }
      if (isPromise(result)) {
        depth--;
        rollback();
        throw new TypeError(`${WHERE} transaction: the function returned a promise; a transaction's function must be synchronous — its awaits would run after COMMIT`);
      }
      depth--;
      instance.exec(outermost ? 'COMMIT' : `RELEASE ${savepoint}`);
      return result;
    },
    migrate(migrations: readonly TMigration<I>[]) {
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
      const from = Number(adapter.pragma('user_version'));
      if (from > last) {
        throw new Error(`${WHERE} migrate: the database is at version ${from}; this code knows up to ${last}`);
      }
      for (const migration of migrations) {
        if (migration.version > from) {
          try {
            adapter.transaction(() => {
              migration.up(adapter);
              instance.exec(`PRAGMA user_version = ${migration.version}`);
            }, {
              immediate: true,
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
    },
    pragma(name, value) {
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
    },
    tableColumns(name) {
      if (typeof name !== 'string' || name === '') {
        throw new TypeError(`${WHERE} tableColumns: expects a table's name, got ${describeValue(name)}`);
      }
      return (instance.prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid').all(name) as {
        name: string;
      }[]).map((row) => row.name);
    },
    compiler,
    instance,
  };
  return adapter;
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
