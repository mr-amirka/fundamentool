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
} from '../../src/sql';
import {
  DRIVERS,
  adapterOf,
} from './drivers';

type TAgent = {
  id: string;
  mode: string;
};

const agents = (db: ReturnType<typeof adapterOf>): string[] => db.prepare<TAgent>(selectFrom('agents', {
  orderBy: ['id'],
})).all().map((row) => row.id);

describe.each(DRIVERS)('sqliteAdapter over %s (S9–S12)', (_name, open) => {
  let db: ReturnType<typeof adapterOf>;
  beforeEach(() => {
    db = adapterOf(open);
    db.exec('CREATE TABLE agents (id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT \'passive\')');
  });

  test('prepare once, run with named values: run, all, get, iterate', () => {
    const add = db.prepare(insertInto('agents', {
      values: {
        id: param('id'),
        mode: param('mode'),
      },
    }));
    expect(add.text).toBe('INSERT INTO "agents" ("id", "mode") VALUES (?, ?)');
    expect(add.run({
      id: 'a',
      mode: 'active',
    })).toMatchObject({
      changes: 1,
    });
    add.run({
      id: 'b',
      mode: 'passive',
    });
    const ofMode = db.prepare<TAgent>(selectFrom('agents', {
      where: eq(col('mode'), param('mode')),
      orderBy: [desc('id')],
    }));
    expect(ofMode.all({
      mode: 'passive',
    }).map((row) => row.id)).toEqual(['b']);
    expect(ofMode.get({
      mode: 'active',
    })?.id).toBe('a');
    expect(ofMode.get({
      mode: 'none',
    })).toBeUndefined();
    expect([
      ...ofMode.iterate({
        mode: 'active',
      }),
    ].map((row) => row.id)).toEqual(['a']);
    expect(db.prepare<{ n: number }>(selectFrom('agents', {
      columns: [alias(fn('count', raw('*')), 'n')],
    })).get()?.n).toBe(2);
  });

  test('an already compiled query; a bad one', () => {
    const compiled = db.compiler.compile(selectFrom('agents', {
      where: eq(col('id'), 'x'),
    }));
    expect(db.prepare(compiled).all()).toEqual([]);
    expect(() => db.prepare('SELECT 1' as never)).toThrow('[fundamentool/sql] prepare: expects a query node or a compiled query');
    expect(() => db.exec(1 as never)).toThrow('[fundamentool/sql] exec: expects SQL text');
  });

  test('RETURNING through all', () => {
    expect(db.prepare<TAgent>(insertInto('agents', {
      values: {
        id: 'r',
      },
      returning: ['*'],
    })).all()).toEqual([
      expect.objectContaining({
        id: 'r',
        mode: 'passive',
      }),
    ]);
  });

  test('a transaction commits what its function did and returns its result', () => {
    const result = db.transaction(() => {
      db.exec('INSERT INTO agents (id) VALUES (\'t\')');
      return 42;
    }, {
      immediate: true,
    });
    expect(result).toBe(42);
    expect(agents(db)).toEqual(['t']);
  });

  test('a throw rolls back and is rethrown as it was', () => {
    const error = new Error('stop');
    expect(() => db.transaction(() => {
      db.exec('INSERT INTO agents (id) VALUES (\'x\')');
      throw error;
    })).toThrow(error);
    expect(agents(db)).toEqual([]);
  });

  test('nested: a savepoint; an inner throw caught inside the outer one rolls back the inner part only', () => {
    db.transaction(() => {
      db.exec('INSERT INTO agents (id) VALUES (\'outer\')');
      expect(() => db.transaction(() => {
        db.exec('INSERT INTO agents (id) VALUES (\'inner\')');
        throw new Error('inner');
      })).toThrow('inner');
      db.transaction(() => db.exec('INSERT INTO agents (id) VALUES (\'kept\')'), {
        immediate: true,
      });
    });
    expect(agents(db)).toEqual([
      'kept',
      'outer',
    ]);
  });

  test('a function returning a promise is refused, and its work rolled back', () => {
    expect(() => db.transaction(() => {
      db.exec('INSERT INTO agents (id) VALUES (\'p\')');
      return Promise.resolve();
    })).toThrow('[fundamentool/sql] transaction: the function returned a promise; a transaction\'s function must be synchronous — its awaits would run after COMMIT');
    expect(agents(db)).toEqual([]);
    expect(() => db.transaction(() => db.transaction(async () => 1))).toThrow('returned a promise');
    expect(() => db.transaction(1 as never)).toThrow('[fundamentool/sql] transaction: expects a function');
    expect(() => db.transaction(() => 1, {
      immediat: true,
    } as never)).toThrow('[fundamentool/sql] transaction: unknown option "immediat". Did you mean "immediate"?');
  });

  test('a rollback SQLite already did itself: the error that did it is the one seen', () => {
    expect(() => db.transaction(() => {
      db.exec('ROLLBACK');
      throw new Error('after');
    })).toThrow('after');
    db.exec('INSERT INTO agents (id) VALUES (\'still works\')');
    expect(agents(db)).toEqual(['still works']);
  });

  test('migrate: each version in its own transaction, kept in user_version', () => {
    const fresh = adapterOf(open);
    const migrations = [
      {
        version: 1,
        up: (m: typeof fresh) => m.exec('CREATE TABLE a (id TEXT PRIMARY KEY)'),
      },
      {
        version: 2,
        up: (m: typeof fresh) => m.exec('ALTER TABLE a ADD COLUMN mode TEXT NOT NULL DEFAULT \'passive\''),
      },
    ];
    expect(fresh.migrate(migrations)).toEqual({
      from: 0,
      to: 2,
    });
    expect(fresh.tableColumns('a')).toEqual([
      'id',
      'mode',
    ]);
    expect(fresh.migrate(migrations)).toEqual({
      from: 2,
      to: 2,
    });
    expect(() => fresh.migrate(migrations.concat([
      {
        version: 3,
        up: (m) => {
          m.exec('CREATE TABLE b (id TEXT)');
          throw new Error('broken');
        },
      },
    ]))).toThrow('[fundamentool/sql] migrate: version 3 failed, rolled back: broken');
    expect(fresh.pragma('user_version')).toBe(2);
    expect(fresh.tableColumns('b')).toEqual([]);
    expect(() => fresh.migrate(migrations.slice(0, 1))).toThrow('[fundamentool/sql] migrate: the database is at version 2; this code knows up to 1');
    const other = adapterOf(open);
    expect(() => other.migrate([
      {
        version: 1,
        up: () => {
          throw 'text';
        },
      },
    ])).toThrow('[fundamentool/sql] migrate: version 1 failed, rolled back: text');
    expect(other.migrate([])).toEqual({
      from: 0,
      to: 0,
    });
  });

  test('migrate refuses a list that isn\'t ascending, unique and whole', () => {
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
      expect(() => fresh.migrate(bad as never)).toThrow('[fundamentool/sql] migrate: expects { version, up } with whole versions from 1, ascending and unique');
    }
    expect(() => fresh.migrate('x' as never)).toThrow('[fundamentool/sql] migrate: expects a list of { version, up }');
  });

  test('pragma: read, set and read back; only words and numbers', () => {
    expect(db.pragma('journal_mode', 'wal')).toBe('memory');
    expect(db.pragma('busy_timeout', 5000)).toBe(5000);
    expect(db.pragma('foreign_keys', true)).toBe(1);
    expect(db.pragma('foreign_keys', false)).toBe(0);
    expect(db.pragma('optimize')).toBeUndefined();
    expect(() => db.pragma('user_version; DROP TABLE agents')).toThrow('[fundamentool/sql] pragma: expects a pragma\'s name — a lower-case word');
    expect(() => db.pragma('user_version', '1; DROP TABLE agents')).toThrow('[fundamentool/sql] pragma: "user_version" expects a number, a boolean or a word');
    expect(() => db.pragma('user_version', NaN)).toThrow('expects a number, a boolean or a word');
  });

  test('tableColumns', () => {
    expect(db.tableColumns('agents')).toEqual([
      'id',
      'mode',
    ]);
    expect(db.tableColumns('nothing')).toEqual([]);
    expect(() => db.tableColumns('')).toThrow('[fundamentool/sql] tableColumns: expects a table\'s name');
  });

  test('the dialect\'s functions are installed', () => {
    expect(db.prepare<{ v: string }>({
      text: 'SELECT fundamentool_lower(\'МИНУТ\') AS v',
      params: [],
      names: [],
    }).get()?.v).toBe('минут');
    expect(db.prepare<{ v: number }>({
      text: 'SELECT fundamentool_regexp(\'abc\', \'B\', \'i\') AS v, fundamentool_regexp(3, \'3\', \'\') AS w',
      params: [],
      names: [],
    }).get()).toMatchObject({
      v: 1,
      w: 0,
    });
  });

  test('the instance as given', () => {
    const instance = open();
    expect(sqliteAdapter(instance).instance).toBe(instance);
  });

  test('error codes from the driver (S13)', () => {
    db.exec('INSERT INTO agents (id) VALUES (\'a\')');
    let caught: unknown;
    try {
      db.exec('INSERT INTO agents (id) VALUES (\'a\')');
    } catch (error) {
      caught = error;
    }
    expect(sqliteErrorCode(caught)).toBe('SQLITE_CONSTRAINT_PRIMARYKEY');
    try {
      db.exec('SELEC 1');
    } catch (error) {
      caught = error;
    }
    expect(sqliteErrorCode(caught)).toBe('SQLITE_ERROR');
  });

  test('busy: a second writer on the same file', () => {
    const folder = mkdtempSync(joinPath(tmpdir(), 'fundamentool-sql-'));
    try {
      const file = joinPath(folder, 'busy.db');
      const first = sqliteAdapter(open(file));
      const second = sqliteAdapter(open(file));
      first.exec('CREATE TABLE t (a)');
      second.pragma('busy_timeout', 0);
      let caught: unknown;
      first.transaction(() => {
        first.exec('INSERT INTO t VALUES (1)');
        try {
          second.transaction(() => second.exec('INSERT INTO t VALUES (2)'), {
            immediate: true,
          });
        } catch (error) {
          caught = error;
        }
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

  test('FTS5: textMatch and fts5Query, with bm25', () => {
    const fts = adapterOf(open, {
      presets: [sqliteFts5],
    });
    fts.exec('CREATE VIRTUAL TABLE docs USING fts5(name, body)');
    const add = fts.prepare(insertInto('docs', {
      values: {
        name: param('name'),
        body: param('body'),
      },
    }));
    add.run({
      name: 'editDistance',
      body: 'edit distance of two strings',
    });
    add.run({
      name: 'editor',
      body: 'an editor',
    });
    const find = fts.prepare<{ name: string }>(selectFrom('docs', {
      columns: ['name'],
      where: textMatch('docs', param('query')),
      orderBy: [fn('bm25', col('docs'))],
    }));
    expect(find.all({
      query: fts5Query(['edit'], {
        prefix: 'both',
      }),
    }).map((row) => row.name)).toEqual([
      'editDistance',
      'editor',
    ]);
    expect(find.all({
      query: fts5Query(['edit']),
    }).map((row) => row.name)).toEqual(['editDistance']);
    expect(find.all({
      query: fts5Query([
        'dist"ance',
        'nothing',
      ]),
    })).toEqual([]);
    expect(fts.prepare(deleteFrom('docs')).run()).toMatchObject({
      changes: 2,
    });
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

  test('a JSON path', () => {
    expect(jsonPath([])).toBe('$');
    expect(jsonPath([
      'a',
      'b c',
      '0',
    ])).toBe('$.a."b c"."0"');
  });
});
