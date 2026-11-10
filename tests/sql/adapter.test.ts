import {
  mkdtempSync,
  rmSync,
} from 'node:fs';
import {
  tmpdir,
} from 'node:os';
import {
  join as joinPath,
} from 'node:path';
import {
  alias,
  col,
  deleteFrom,
  desc,
  eq,
  fn,
  fts5Phrase,
  fts5Query,
  insertInto,
  jsonPath,
  param,
  raw,
  selectFrom,
  sqliteAdapter,
  sqliteErrorCode,
  sqliteFts5,
  textMatch,
  type TSqliteSession,
} from '../../src/sql';
import {
  DRIVERS,
  adapterOf,
} from './drivers';

type TAgent = {
  id: string;
  mode: string;
};

const agents = async (db: TSqliteSession): Promise<string[]> => (await db.prepare<TAgent>(selectFrom('agents', {
  orderBy: ['id'],
})).all()).map((row) => row.id);

const insertAgent = (id: string): string => `INSERT INTO agents (id) VALUES ('${id}')`;

describe.each(DRIVERS)('sqliteAdapter over %s (S9–S12)', (_name, open) => {
  let db: ReturnType<typeof adapterOf>;
  beforeEach(async () => {
    db = adapterOf(open);
    await db.exec('CREATE TABLE agents (id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT \'passive\')');
  });

  test('prepare once, run with named values: run, all, get, iterate — each a promise', async () => {
    const add = db.prepare(insertInto('agents', {
      values: {
        id: param('id'),
        mode: param('mode'),
      },
    }));
    expect(add.text).toBe('INSERT INTO "agents" ("id", "mode") VALUES (?, ?)');
    await expect(add.run({
      id: 'a',
      mode: 'active',
    })).resolves.toMatchObject({
      changes: 1,
    });
    await add.run({
      id: 'b',
      mode: 'passive',
    });
    const ofMode = db.prepare<TAgent>(selectFrom('agents', {
      where: eq(col('mode'), param('mode')),
      orderBy: [desc('id')],
    }));
    expect((await ofMode.all({
      mode: 'passive',
    })).map((row) => row.id)).toEqual(['b']);
    expect((await ofMode.get({
      mode: 'active',
    }))?.id).toBe('a');
    await expect(ofMode.get({
      mode: 'none',
    })).resolves.toBeUndefined();
    const ids: string[] = [];
    for await (const row of db.prepare<TAgent>(selectFrom('agents', {
      orderBy: ['id'],
    })).iterate()) {
      ids.push(row.id);
    }
    expect(ids).toEqual([
      'a',
      'b',
    ]);
    expect((await db.prepare<{ n: number }>(selectFrom('agents', {
      columns: [alias(fn('count', raw('*')), 'n')],
    })).get())?.n).toBe(2);
  });

  test('iterate: a loop left early releases the statement', async () => {
    await db.exec(`${insertAgent('a')}; ${insertAgent('b')}`);
    const all = db.prepare<TAgent>(selectFrom('agents'));
    for await (const row of all.iterate()) {
      expect(row.id).toBe('a');
      break;
    }
    await db.exec(insertAgent('c'));
    expect(await agents(db)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('an already compiled query; a bad one; a bad value is a rejection', async () => {
    const compiled = db.compiler.compile(selectFrom('agents', {
      where: eq(col('id'), 'x'),
    }));
    await expect(db.prepare(compiled).all()).resolves.toEqual([]);
    expect(() => db.prepare('SELECT 1' as never)).toThrow('[fundamentool/sql] prepare: expects a query node, a compiled query { text, params, names } or a statement of this adapter');
    expect(() => db.prepare({
      text: 'SELECT 1',
    } as never)).toThrow('or a statement of this adapter');
    await expect(db.exec(1 as never)).rejects.toThrow('[fundamentool/sql] exec: expects SQL text');
    const byId = db.prepare(selectFrom('agents', {
      where: eq(col('id'), param('id')),
    }));
    await expect(byId.all({
      id: new Date(0),
    })).rejects.toThrow('[fundamentool/sql] value:');
  });

  test('RETURNING through all', async () => {
    await expect(db.prepare<TAgent>(insertInto('agents', {
      values: {
        id: 'r',
      },
      returning: ['*'],
    })).all()).resolves.toEqual([
      expect.objectContaining({
        id: 'r',
        mode: 'passive',
      }),
    ]);
  });

  test('a transaction commits what its function did and resolves to its result; a sync function too', async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec(insertAgent('t'));
      return 42;
    }, {
      immediate: true,
    })).resolves.toBe(42);
    await expect(db.transaction((tx) => {
      void tx.exec(insertAgent('s'));
      return 'sync';
    })).resolves.toBe('sync');
    expect(await agents(db)).toEqual([
      's',
      't',
    ]);
  });

  test('a rejection or a throw rolls back and is passed on as it was', async () => {
    const error = new Error('stop');
    await expect(db.transaction(async (tx) => {
      await tx.exec(insertAgent('x'));
      throw error;
    })).rejects.toBe(error);
    await expect(db.transaction(() => {
      throw error;
    })).rejects.toBe(error);
    expect(await agents(db)).toEqual([]);
  });

  test('nested: a savepoint; an inner rejection caught inside the outer one rolls back the inner part only', async () => {
    await db.transaction(async (tx) => {
      await tx.exec(insertAgent('outer'));
      await expect(tx.transaction(async (inner) => {
        await inner.exec(insertAgent('inner'));
        throw new Error('inner');
      })).rejects.toThrow('inner');
      await tx.transaction((inner) => inner.transaction((deeper) => deeper.exec(insertAgent('kept'))), {
        immediate: true,
      });
    });
    expect(await agents(db)).toEqual([
      'kept',
      'outer',
    ]);
  });

  test('the connection waits while a transaction runs: other code\'s statements land after its COMMIT', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = db.transaction(async (tx) => {
      await tx.exec(insertAgent('in'));
      order.push('in');
      await gate;
      throw new Error('rolled back');
    });
    const other = db.exec(insertAgent('other')).then(() => order.push('other'));
    const read = agents(db);
    await Promise.resolve();
    release();
    await expect(writer).rejects.toThrow('rolled back');
    await other;
    expect(order).toEqual([
      'in',
      'other',
    ]);
    expect(await read).toEqual(['other']);
  });

  test('statements in one transaction run in the order called; COMMIT waits for those left running', async () => {
    await db.transaction((tx) => {
      void tx.exec(insertAgent('b'));
      void tx.exec(insertAgent('a'));
    });
    expect(await agents(db)).toEqual([
      'a',
      'b',
    ]);
    const both = db.transaction((tx) => Promise.all([
      tx.exec(insertAgent('c')),
      tx.exec(insertAgent('c')),
    ]));
    await expect(both).rejects.toThrow();
    expect(await agents(db)).toEqual([
      'a',
      'b',
    ]);
  });

  test('a statement prepared on the connection runs in a transaction through tx.prepare, prepared once', async () => {
    const add = db.prepare(insertInto('agents', {
      values: {
        id: param('id'),
      },
    }));
    await db.transaction(async (tx) => {
      const inTx = tx.prepare(add);
      expect(inTx.text).toBe(add.text);
      await inTx.run({
        id: 'tx',
      });
      throw new Error('undo');
    }).catch(() => undefined);
    await add.run({
      id: 'db',
    });
    expect(await agents(db)).toEqual(['db']);
  });

  test('a transaction\'s session is over when its function settled', async () => {
    let kept: TSqliteSession | undefined;
    await db.transaction((tx) => {
      kept = tx;
    });
    await expect(kept!.exec(insertAgent('late'))).rejects.toThrow('[fundamentool/sql] transaction: this transaction is over — its function had settled; run the statement on the session the transaction was opened on');
    await expect(kept!.transaction(() => 1)).rejects.toThrow('this transaction is over');
    expect(await agents(db)).toEqual([]);
  });

  test('an outer session called from inside a transaction\'s function is a rejection at once, not a wait forever', async () => {
    const all = db.prepare(selectFrom('agents'));
    const outer = /an operation on an outer session \(db, or an outer transaction's tx\) called from inside a transaction's function .* run it on the transaction's own session: tx\.prepare\(statement\), tx\.exec, tx\.transaction/;
    await expect(db.transaction(async (tx) => {
      await tx.exec(insertAgent('undone'));
      return all.all();
    })).rejects.toThrow(outer);
    expect(await agents(db)).toEqual([]);
    const caught = await db.transaction(async (tx) => {
      await tx.exec(insertAgent('kept'));
      const tries = await Promise.allSettled([
        db.exec(insertAgent('db')),
        db.transaction(() => 1),
        db.pragma('user_version'),
        db.tableColumns('agents'),
        tx.transaction(async () => {
          await expect(tx.exec(insertAgent('outer tx'))).rejects.toThrow(outer);
          await expect(db.exec(insertAgent('db, two deep'))).rejects.toThrow(outer);
        }),
      ]);
      return tries.map((one) => one.status);
    });
    expect(caught).toEqual([
      'rejected',
      'rejected',
      'rejected',
      'rejected',
      'fulfilled',
    ]);
    expect(await agents(db)).toEqual(['kept']);
  });

  test('inside a migration\'s up too; once the function settled, what it left behind may use db', async () => {
    await expect(db.migrate([
      {
        version: 1,
        up: () => db.exec(insertAgent('m')),
      },
    ])).rejects.toThrow(/version 1 failed, rolled back: .*an operation on an outer session/);
    let after!: Promise<void>;
    await db.transaction((tx) => {
      void tx.exec(insertAgent('in'));
      after = new Promise<void>((done) => {
        setTimeout(() => {
          void db.exec(insertAgent('after')).then(done);
        }, 0);
      });
    });
    await after;
    expect(await agents(db)).toEqual([
      'after',
      'in',
    ]);
  });

  test('a transaction\'s own checks are rejections', async () => {
    await expect(db.transaction(1 as never)).rejects.toThrow('[fundamentool/sql] transaction: expects a function');
    await expect(db.transaction(() => 1, {
      immediat: true,
    } as never)).rejects.toThrow('[fundamentool/sql] transaction: unknown option "immediat". Did you mean "immediate"?');
  });

  test('a rollback SQLite already did itself: the error that did it is the one seen', async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec('ROLLBACK');
      throw new Error('after');
    })).rejects.toThrow('after');
    await expect(db.transaction((tx) => tx.exec('ROLLBACK'))).rejects.toThrow(/no transaction is active/);
    await db.exec(insertAgent('still works'));
    expect(await agents(db)).toEqual(['still works']);
  });

  test('a failed COMMIT rolls back and is passed on', async () => {
    await db.exec('PRAGMA foreign_keys = ON; CREATE TABLE owners (id TEXT PRIMARY KEY); CREATE TABLE pets (owner TEXT REFERENCES owners (id) DEFERRABLE INITIALLY DEFERRED)');
    await expect(db.transaction((tx) => tx.exec('INSERT INTO pets VALUES (\'nobody\')'))).rejects.toThrow(/FOREIGN KEY constraint failed/);
    await expect(db.prepare(selectFrom('pets')).all()).resolves.toEqual([]);
    await db.transaction((tx) => tx.exec(insertAgent('next')));
    expect(await agents(db)).toEqual(['next']);
  });

  test('migrate: each version in its own transaction, kept in user_version; up may wait', async () => {
    const fresh = adapterOf(open);
    const migrations = [
      {
        version: 1,
        up: (m: TSqliteSession) => m.exec('CREATE TABLE a (id TEXT PRIMARY KEY)'),
      },
      {
        version: 2,
        up: async (m: TSqliteSession) => {
          await m.exec('ALTER TABLE a ADD COLUMN mode TEXT NOT NULL DEFAULT \'passive\'');
        },
      },
    ];
    await expect(fresh.migrate(migrations)).resolves.toEqual({
      from: 0,
      to: 2,
    });
    await expect(fresh.tableColumns('a')).resolves.toEqual([
      'id',
      'mode',
    ]);
    await expect(fresh.migrate(migrations)).resolves.toEqual({
      from: 2,
      to: 2,
    });
    await expect(fresh.migrate(migrations.concat([
      {
        version: 3,
        up: async (m) => {
          await m.exec('CREATE TABLE b (id TEXT)');
          throw new Error('broken');
        },
      },
    ]))).rejects.toThrow('[fundamentool/sql] migrate: version 3 failed, rolled back: broken');
    await expect(fresh.pragma('user_version')).resolves.toBe(2);
    await expect(fresh.tableColumns('b')).resolves.toEqual([]);
    await expect(fresh.migrate(migrations.slice(0, 1))).rejects.toThrow('[fundamentool/sql] migrate: the database is at version 2; this code knows up to 1');
    const other = adapterOf(open);
    await expect(other.migrate([
      {
        version: 1,
        up: () => {
          throw 'text';
        },
      },
    ])).rejects.toThrow('[fundamentool/sql] migrate: version 1 failed, rolled back: text');
    await expect(other.migrate([])).resolves.toEqual({
      from: 0,
      to: 0,
    });
  });

  test('two migrate calls at once: the second waits and finds the work done', async () => {
    const fresh = adapterOf(open);
    const migrations = [
      {
        version: 1,
        up: (m: TSqliteSession) => m.exec('CREATE TABLE a (id TEXT PRIMARY KEY)'),
      },
    ];
    await expect(Promise.all([
      fresh.migrate(migrations),
      fresh.migrate(migrations),
    ])).resolves.toEqual([
      {
        from: 0,
        to: 1,
      },
      {
        from: 1,
        to: 1,
      },
    ]);
  });

  test('migrate refuses a list that isn\'t ascending, unique and whole', async () => {
    const fresh = adapterOf(open);
    for (const bad of [
      [
        {
          version: 0,
          up: () => {},
        },
      ],
      [
        {
          version: 2,
          up: () => {},
        },
        {
          version: 2,
          up: () => {},
        },
      ],
      [
        {
          version: 1.5,
          up: () => {},
        },
      ],
      [
        {
          version: 1,
        },
      ],
      [null],
    ]) {
      await expect(fresh.migrate(bad as never)).rejects.toThrow('[fundamentool/sql] migrate: expects { version, up } with whole versions from 1, ascending and unique');
    }
    await expect(fresh.migrate('x' as never)).rejects.toThrow('[fundamentool/sql] migrate: expects a list of { version, up }');
  });

  test('pragma: read, set and read back; only words and numbers', async () => {
    await expect(db.pragma('journal_mode', 'wal')).resolves.toBe('memory');
    await expect(db.pragma('busy_timeout', 5000)).resolves.toBe(5000);
    await expect(db.pragma('foreign_keys', true)).resolves.toBe(1);
    await expect(db.pragma('foreign_keys', false)).resolves.toBe(0);
    await expect(db.pragma('optimize')).resolves.toBeUndefined();
    await expect(db.pragma('user_version; DROP TABLE agents')).rejects.toThrow('[fundamentool/sql] pragma: expects a pragma\'s name — a lower-case word');
    await expect(db.pragma('user_version', '1; DROP TABLE agents')).rejects.toThrow('[fundamentool/sql] pragma: "user_version" expects a number, a boolean or a word');
    await expect(db.pragma('user_version', NaN)).rejects.toThrow('expects a number, a boolean or a word');
  });

  test('tableColumns', async () => {
    await expect(db.tableColumns('agents')).resolves.toEqual([
      'id',
      'mode',
    ]);
    await expect(db.tableColumns('nothing')).resolves.toEqual([]);
    await expect(db.tableColumns('')).rejects.toThrow('[fundamentool/sql] tableColumns: expects a table\'s name');
  });

  test('the dialect\'s functions are installed', async () => {
    expect((await db.prepare<{ v: string }>({
      text: 'SELECT fundamentool_lower(\'МИНУТ\') AS v',
      params: [],
      names: [],
    }).get())?.v).toBe('минут');
    await expect(db.prepare<{ v: number }>({
      text: 'SELECT fundamentool_regexp(\'abc\', \'B\', \'i\') AS v, fundamentool_regexp(3, \'3\', \'\') AS w',
      params: [],
      names: [],
    }).get()).resolves.toMatchObject({
      v: 1,
      w: 0,
    });
  });

  test('the instance as given', () => {
    const instance = open();
    expect(sqliteAdapter(instance).instance).toBe(instance);
  });

  test('error codes from the driver (S13)', async () => {
    await db.exec(insertAgent('a'));
    let caught: unknown;
    await db.exec(insertAgent('a')).catch((error: unknown) => {
      caught = error;
    });
    expect(sqliteErrorCode(caught)).toBe('SQLITE_CONSTRAINT_PRIMARYKEY');
    await db.exec('SELEC 1').catch((error: unknown) => {
      caught = error;
    });
    expect(sqliteErrorCode(caught)).toBe('SQLITE_ERROR');
  });

  test('busy: a second writer on the same file', async () => {
    const folder = mkdtempSync(joinPath(tmpdir(), 'fundamentool-sql-'));
    try {
      const file = joinPath(folder, 'busy.db');
      const first = sqliteAdapter(open(file));
      const second = sqliteAdapter(open(file));
      await first.exec('CREATE TABLE t (a)');
      await second.pragma('busy_timeout', 0);
      let caught: unknown;
      await first.transaction(async (tx) => {
        await tx.exec('INSERT INTO t VALUES (1)');
        await second.transaction((other) => other.exec('INSERT INTO t VALUES (2)'), {
          immediate: true,
        }).catch((error: unknown) => {
          caught = error;
        });
      }, {
        immediate: true,
      });
      expect(sqliteErrorCode(caught)).toBe('SQLITE_BUSY');
      (first.instance as unknown as { close(): void }).close();
      (second.instance as unknown as { close(): void }).close();
    } finally {
      rmSync(folder, {
        recursive: true,
        force: true,
      });
    }
  });

  test('FTS5: textMatch and fts5Query, with bm25', async () => {
    const fts = adapterOf(open, {
      presets: [sqliteFts5],
    });
    await fts.exec('CREATE VIRTUAL TABLE docs USING fts5(name, body)');
    const add = fts.prepare(insertInto('docs', {
      values: {
        name: param('name'),
        body: param('body'),
      },
    }));
    await add.run({
      name: 'editDistance',
      body: 'edit distance of two strings',
    });
    await add.run({
      name: 'editor',
      body: 'an editor',
    });
    const find = fts.prepare<{ name: string }>(selectFrom('docs', {
      columns: ['name'],
      where: textMatch('docs', param('query')),
      orderBy: [fn('bm25', col('docs'))],
    }));
    expect((await find.all({
      query: fts5Query(['edit'], {
        prefix: 'both',
      }),
    })).map((row) => row.name)).toEqual([
      'editDistance',
      'editor',
    ]);
    expect((await find.all({
      query: fts5Query(['edit']),
    })).map((row) => row.name)).toEqual(['editDistance']);
    await expect(find.all({
      query: fts5Query([
        'dist"ance',
        'nothing',
      ]),
    })).resolves.toEqual([]);
    await expect(fts.prepare(deleteFrom('docs')).run()).resolves.toMatchObject({
      changes: 2,
    });
  });

  test('FTS5: fts5Phrase — the words adjacent, in order; the last one a prefix', async () => {
    const fts = adapterOf(open, {
      presets: [sqliteFts5],
    });
    await fts.exec('CREATE VIRTUAL TABLE docs USING fts5(name, body)');
    const add = fts.prepare(insertInto('docs', {
      values: {
        name: param('name'),
        body: param('body'),
      },
    }));
    await add.run({
      name: 'term',
      body: 'kept in-focus for development',
    });
    await add.run({
      name: 'css',
      body: 'in a :focus state',
    });
    await add.run({
      name: 'ru',
      body: 'держать в фокусе для развития',
    });
    const find = fts.prepare<{ name: string }>(selectFrom('docs', {
      columns: ['name'],
      where: textMatch('docs', param('query')),
    }));
    expect((await find.all({
      query: fts5Phrase([
        'in',
        'focus',
      ]),
    })).map((row) => row.name)).toEqual(['term']);
    expect((await find.all({
      query: fts5Phrase([
        'в',
        'фокус',
      ], {
        prefix: true,
      }),
    })).map((row) => row.name)).toEqual(['ru']);
    await expect(find.all({
      query: fts5Phrase([
        'focus',
        'in',
      ]),
    })).resolves.toEqual([]);
  });
});

describe('sqliteAdapter\'s own checks', () => {
  test('not a SQLite database', () => {
    expect(() => sqliteAdapter({} as never)).toThrow('[fundamentool/sql] sqliteAdapter: expects a SQLite database (better-sqlite3 or node:sqlite), got');
    expect(() => sqliteAdapter(null as never)).toThrow('expects a SQLite database');
    expect(() => sqliteAdapter(DRIVERS[0][1](), {
      preset: [],
    } as never)).toThrow('[fundamentool/sql] sqliteAdapter: unknown option "preset". Did you mean "presets"?');
  });
});

describe('sqliteErrorCode', () => {
  test.each<[unknown, string | undefined]>([
    [
      {
        code: 'SQLITE_BUSY',
      },
      'SQLITE_BUSY',
    ],
    [
      {
        code: 'ERR_SQLITE_ERROR',
        errcode: 1555,
      },
      'SQLITE_CONSTRAINT_PRIMARYKEY',
    ],
    [
      {
        errcode: 5,
      },
      'SQLITE_BUSY',
    ],
    [
      {
        errcode: 516,
      },
      'SQLITE_ABORT_ROLLBACK',
    ],
    [
      {
        errcode: 8714,
      },
      'SQLITE_IOERR_IN_PAGE',
    ],
    [
      {
        errcode: 5 | 40 << 8,
      },
      'SQLITE_BUSY',
    ],
    [
      {
        errcode: 13 | 1 << 8,
      },
      'SQLITE_FULL',
    ],
    [
      {
        errcode: 99,
      },
      undefined,
    ],
    [
      {
        errcode: -1,
      },
      undefined,
    ],
    [
      {
        errcode: '5',
      },
      undefined,
    ],
    [
      {
        code: 'ENOENT',
      },
      undefined,
    ],
    [
      'SQLITE_BUSY',
      undefined,
    ],
    [
      null,
      undefined,
    ],
  ])('%p → %p', (error, code) => {
    expect(sqliteErrorCode(error)).toBe(code);
  });
});

describe('the dialect\'s functions, called as SQLite calls them', () => {
  const functions = sqliteAdapter(DRIVERS[0][1]()).compiler.functions;

  test('fundamentool_lower leaves a non-string as it is', () => {
    expect(functions.fundamentool_lower(null)).toBeNull();
    expect(functions.fundamentool_lower('ÄБ')).toBe('äб');
  });

  test('fundamentool_regexp keeps a bounded set of compiled RegExps', () => {
    for (let i = 0; i < 70; i++) {
      expect(functions.fundamentool_regexp(
        `a${i}`, `^a${i}$`, '',
      )).toBe(1);
    }
    expect(functions.fundamentool_regexp(
      'a1', '^a1$', '',
    )).toBe(1);
  });

  test('textMatch takes a column node and a parameter node', () => {
    expect(textMatch(col('t'), param('q'))).toEqual({
      kind: 'text-match',
      of: col('t'),
      query: param('q'),
    });
    expect(textMatch('t', 'edit').query).toEqual({
      kind: 'value',
      value: 'edit',
    });
  });
});

describe('fts5Query and jsonPath', () => {
  test('words quoted, " doubled, empty ones left out', () => {
    expect(fts5Query([
      'edit',
      '',
      'dist"ance',
    ], {
      prefix: true,
    })).toBe('"edit"* OR "dist""ance"*');
    expect(fts5Query(['a'], {
      prefix: 'both',
    })).toBe('("a" OR "a"*)');
    expect(() => fts5Query([''])).toThrow('[fundamentool/sql] fts5Query: no words — FTS5 can\'t match an empty query');
    expect(() => fts5Query([1 as never])).toThrow('[fundamentool/sql] fts5Query: expects words');
    expect(() => fts5Query(['a'], {
      prefix: 'yes',
    } as never)).toThrow('[fundamentool/sql] fts5Query');
  });

  test('a phrase\'s query text', () => {
    expect(fts5Phrase([
      'in',
      '',
      'fo"cus',
    ])).toBe('"in fo""cus"');
    expect(fts5Phrase(['в'], {
      prefix: true,
    })).toBe('"в"*');
    expect(() => fts5Phrase([''])).toThrow('[fundamentool/sql] fts5Phrase: no words — FTS5 can\'t match an empty phrase');
    expect(() => fts5Phrase([1 as never])).toThrow('[fundamentool/sql] fts5Phrase: expects words');
    expect(() => fts5Phrase(['a'], {
      prefix: 'both',
    } as never)).toThrow('[fundamentool/sql] fts5Phrase');
  });

  test('a JSON path', () => {
    expect(jsonPath([])).toBe('$');
    expect(jsonPath([
      'a',
      'b c',
      '0',
    ])).toBe('$.a."b c"."0"');
  });
});
