import {
  alias,
  and,
  asc,
  col,
  deleteFrom,
  desc,
  eq,
  fn,
  gt,
  gte,
  inList,
  insertInto,
  isNull,
  isSqlNode,
  join,
  jsonGet,
  leftJoin,
  like,
  lt,
  lte,
  ne,
  not,
  or,
  param,
  raw,
  selectFrom,
  sqlCompiler,
  sqlDialect,
  sqlite,
  table,
  update,
  valueNode,
  type TSqlNode,
  type TSqlPreset,
} from '../../src/sql';

const compiler = sqlCompiler({
  presets: [sqlite],
});
const base = sqlCompiler();

describe('the base forms, through sqlite (B12: the text per node)', () => {
  test.each<[string, TSqlNode, string, unknown[]]>([
    [
      'every column',
      selectFrom('units'),
      'SELECT * FROM "units"',
      [],
    ],
    [
      'columns, where, order',
      selectFrom('nodes', {
        columns: [
          'id',
          'heading',
        ],
        where: eq(col('file'), 'a.md'),
        orderBy: [
          'line_from',
          desc('id'),
        ],
      }),
      'SELECT "id", "heading" FROM "nodes" WHERE "file" = ? ORDER BY "line_from" ASC, "id" DESC',
      ['a.md'],
    ],
    [
      'distinct, group, having, limit, offset',
      selectFrom('units', {
        distinct: true,
        columns: [
          'project',
          alias(fn('count', raw('*')), 'n'),
        ],
        groupBy: ['project'],
        having: gt(fn('count', raw('*')), 1),
        limit: 10,
        offset: 20,
      }),
      'SELECT DISTINCT "project", count(*) AS "n" FROM "units" GROUP BY "project" HAVING count(*) > ? LIMIT ? OFFSET ?',
      [
        1,
        10,
        20,
      ],
    ],
    [
      'an offset alone: LIMIT -1 in SQLite',
      selectFrom('units', {
        offset: param('skip'),
      }),
      'SELECT * FROM "units" LIMIT -1 OFFSET ?',
      [undefined],
    ],
    [
      'a dotted column, a star, a table alias, a join',
      selectFrom(join(
        table('units_fts'), table('units', 'u'), eq(col('u.rid'), col('units_fts.rowid')),
      ), {
        columns: ['u.*'],
      }),
      'SELECT "u".* FROM "units_fts" JOIN "units" AS "u" ON "u"."rid" = "units_fts"."rowid"',
      [],
    ],
    [
      'a left join of names',
      selectFrom(leftJoin(
        'files', 'units', eq(col('units.file'), col('files.path')),
      )),
      'SELECT * FROM "files" LEFT JOIN "units" ON "units"."file" = "files"."path"',
      [],
    ],
    [
      'a quote in a name is doubled',
      selectFrom('my "table"'),
      'SELECT * FROM "my ""table"""',
      [],
    ],
    [
      'and / or / not with their parentheses',
      selectFrom('t', {
        where: and(
          or(eq(col('a'), 1), eq(col('b'), 2)), not(isNull(col('c'))), raw('d > 0'),
        ),
      }),
      'SELECT * FROM "t" WHERE ("a" = ? OR "b" = ?) AND NOT ("c" IS NULL) AND (d > 0)',
      [
        1,
        2,
      ],
    ],
    [
      'and() is true, or() false, one condition as it is (an and, so in parentheses under or)',
      selectFrom('t', {
        where: or(
          and(), or(), and(eq(col('a'), 1)),
        ),
      }),
      'SELECT * FROM "t" WHERE (1 = 1) OR (1 = 0) OR ("a" = ?)',
      [1],
    ],
    [
      'every comparison',
      selectFrom('t', {
        where: and(
          ne(col('a'), 1), lt(col('b'), 2), lte(col('c'), 3), gte(col('d'), 4),
        ),
      }),
      'SELECT * FROM "t" WHERE "a" <> ? AND "b" < ? AND "c" <= ? AND "d" >= ?',
      [
        1,
        2,
        3,
        4,
      ],
    ],
    [
      'a loose operand in parentheses',
      selectFrom('t', {
        where: eq(eq(col('a'), 1), 0),
      }),
      'SELECT * FROM "t" WHERE ("a" = ?) = ?',
      [
        1,
        0,
      ],
    ],
    [
      'in, an empty in, like',
      selectFrom('t', {
        where: and(
          inList(col('k'), [
            'a',
            'b',
          ]), inList(col('k'), []), like(col('p'), 'x/%'),
        ),
      }),
      'SELECT * FROM "t" WHERE "k" IN (?, ?) AND 1 = 0 AND "p" LIKE ?',
      [
        'a',
        'b',
        'x/%',
      ],
    ],
    [
      'jsonGet: a bare key, a quoted one, the whole value',
      selectFrom('t', {
        columns: [
          jsonGet(col('attrs'), 'status'),
          jsonGet(col('attrs'), [
            'my key',
            'b',
          ]),
          jsonGet(col('attrs'), []),
        ],
      }),
      'SELECT json_extract("attrs", \'$.status\'), json_extract("attrs", \'$."my key".b\'), json_extract("attrs", \'$\') FROM "t"',
      [],
    ],
    [
      'booleans bound as 1 / 0',
      selectFrom('t', {
        where: and(eq(col('a'), true), eq(col('b'), false)),
      }),
      'SELECT * FROM "t" WHERE "a" = ? AND "b" = ?',
      [
        1,
        0,
      ],
    ],
    [
      'an insert of two rows',
      insertInto('t', {
        values: [
          {
            a: 1,
            b: param('b'),
          },
          {
            a: 2,
            b: null,
          },
        ],
      }),
      'INSERT INTO "t" ("a", "b") VALUES (?, ?), (?, ?)',
      [
        1,
        undefined,
        2,
        null,
      ],
    ],
    [
      'an upsert, returning',
      insertInto('files', {
        values: {
          path: 'a',
          mtime: 1,
        },
        onConflict: {
          target: ['path'],
          update: ['mtime'],
        },
        returning: [
          'path',
          '*',
        ],
      }),
      'INSERT INTO "files" ("path", "mtime") VALUES (?, ?) ON CONFLICT ("path") DO UPDATE SET "mtime" = excluded."mtime" RETURNING "path", *',
      [
        'a',
        1,
      ],
    ],
    [
      'on conflict do nothing, with no target',
      insertInto('t', {
        values: {
          a: 1,
        },
        onConflict: {
          target: [],
          nothing: true,
        },
      }),
      'INSERT INTO "t" ("a") VALUES (?) ON CONFLICT DO NOTHING',
      [1],
    ],
    [
      'an update: undefined left out (S8)',
      update('Projects', {
        set: {
          previewPath: '/a.png',
          openedAt: undefined,
        },
        where: eq(col('id'), 7),
        returning: ['id'],
      }),
      'UPDATE "Projects" SET "previewPath" = ? WHERE "id" = ? RETURNING "id"',
      [
        '/a.png',
        7,
      ],
    ],
    [
      'a delete',
      deleteFrom('nodes', {
        where: eq(col('file'), param('file')),
      }),
      'DELETE FROM "nodes" WHERE "file" = ?',
      [undefined],
    ],
    [
      'an update with no returning',
      update('t', {
        set: {
          a: 1,
        },
      }),
      'UPDATE "t" SET "a" = ?',
      [1],
    ],
    [
      'a delete of every row',
      deleteFrom('nodes'),
      'DELETE FROM "nodes"',
      [],
    ],
  ])('%s', (
    _name, node, text, params,
  ) => {
    const compiled = compiler.compile(node);
    expect(compiled.text).toBe(text);
    expect(compiled.params).toEqual(params);
  });

  test('the base alone binds a boolean as it is', () => {
    expect(base.compile(eq(col('a'), true)).params).toEqual([true]);
  });
});

describe('compile once, bind per call (S3)', () => {
  const query = compiler.compile(selectFrom('nodes', {
    where: and(
      eq(col('file'), param('file')), gt(col('line'), 3), eq(col('alt'), param('file')),
    ),
  }));

  test('names beside params; a name used twice fills both slots', () => {
    expect(query.names).toEqual([
      'file',
      undefined,
      'file',
    ]);
    expect(compiler.bind(query, {
      file: 'a.md',
    })).toEqual([
      'a.md',
      3,
      'a.md',
    ]);
  });

  test('a named value goes through the dialect\'s value', () => {
    expect(compiler.bind(query, {
      file: true,
    })).toEqual([
      1,
      3,
      1,
    ]);
  });

  test('a missing value, an unknown name with the nearest known one', () => {
    expect(() => compiler.bind(query)).toThrow('[fundamentool/sql] bind: no value for "file"');
    expect(() => compiler.bind(query, {
      file: 'a',
      fiel: 'b',
    })).toThrow('[fundamentool/sql] bind: unknown parameter "fiel". Did you mean "file"? Parameters: file, file');
    // Counted once: the second call reads the kept names.
    expect(() => compiler.bind(query, {
      file: 'a',
      xyz: 'b',
    })).toThrow('unknown parameter "xyz". Parameters: file, file');
  });

  test('a query with no names: its params, and any value is unknown', () => {
    const fixed = compiler.compile(eq(col('a'), 1));
    expect(compiler.bind(fixed)).toEqual([1]);
    expect(compiler.bind(fixed, {})).toEqual([1]);
    expect(() => compiler.bind(fixed, {
      a: 1,
    })).toThrow('Parameters: none');
  });

  test('a value bound by name is refused as at compile', () => {
    expect(() => compiler.bind(query, {
      file: new Date(0),
    })).toThrow('[fundamentool/sql] value: a Date can\'t be bound');
  });
});

describe('values: what the drivers bind (P4)', () => {
  test.each([
    [
      new Date(0),
      'a Date can\'t be bound — pass date.getTime() or date.toISOString(), as the column stores it',
    ],
    [
      undefined,
      'undefined can\'t be bound — leave the column out, or pass null',
    ],
    [
      {
        a: 1,
      },
      'can\'t bind',
    ],
  ])('%p is refused', (value, text) => {
    expect(() => compiler.compile(eq(col('a'), value as never))).toThrow(text);
  });

  test('a string, a number, a bigint, null, a Uint8Array pass', () => {
    const bytes = new Uint8Array([1]);
    expect(compiler.compile(fn(
      'f', 'a', 1, 2n, bytes, valueNode(null),
    )).params).toEqual([
      'a',
      1,
      2n,
      bytes,
      null,
    ]);
  });

  test('an insert row with undefined is refused', () => {
    expect(() => compiler.compile(insertInto('t', {
      values: {
        a: undefined as never,
      },
    }))).toThrow('undefined can\'t be bound');
  });
});

describe('the builders\' own checks', () => {
  test.each<[string, () => unknown, string]>([
    [
      'col',
      () => col(''),
      '[fundamentool/sql] col: expects a column\'s name',
    ],
    [
      'param',
      () => param(3 as never),
      '[fundamentool/sql] param: expects a parameter\'s name',
    ],
    [
      'raw',
      () => raw(1 as never),
      '[fundamentool/sql] raw: expects SQL text',
    ],
    [
      'fn: a name that isn\'t a word',
      () => fn('count(*); DROP TABLE t; --'),
      '[fundamentool/sql] fn: expects a function\'s name — a word',
    ],
    [
      'eq with null',
      () => eq(col('a'), null),
      '[fundamentool/sql] eq: a comparison with null is never true in SQL — isNull(x)',
    ],
    [
      'ne with null',
      () => ne(null, col('a')),
      'isNull(x) under not()',
    ],
    [
      'inList without a list',
      () => inList(col('a'), 'x' as never),
      '[fundamentool/sql] inList: expects a list',
    ],
    [
      'jsonGet with a number',
      () => jsonGet(col('a'), [1 as never]),
      '[fundamentool/sql] jsonGet: expects a key or a list of keys',
    ],
    [
      'alias without a name',
      () => alias(col('a'), ''),
      '[fundamentool/sql] alias: expects a name',
    ],
    [
      'table without a name',
      () => table(''),
      '[fundamentool/sql] table: expects a table\'s name',
    ],
    [
      'insertInto with no rows',
      () => insertInto('t', {
        values: [],
      }),
      '[fundamentool/sql] insertInto: no rows in "values"',
    ],
    [
      'insertInto with an empty row',
      () => insertInto('t', {
        values: {},
      }),
      'a row with no columns',
    ],
    [
      'insertInto with rows of different columns',
      () => insertInto('t', {
        values: [
          {
            a: 1,
          },
          {
            b: 1,
          },
        ],
      }),
      'every row needs the same columns as the first: a; got b',
    ],
    [
      'an upsert with neither update nor nothing',
      () => insertInto('t', {
        values: {
          a: 1,
        },
        onConflict: {
          target: ['a'],
        },
      }),
      'onConflict needs "update" (the columns to take) or "nothing: true"',
    ],
    [
      'an upsert updating without a target',
      () => insertInto('t', {
        values: {
          a: 1,
        },
        onConflict: {
          target: [],
          update: ['a'],
        },
      }),
      'onConflict "update" needs a "target"',
    ],
    [
      'an update with nothing to set',
      () => update('t', {
        set: {
          a: undefined,
        },
      }),
      '[fundamentool/sql] update: nothing to set',
    ],
    [
      'an unknown option, in development',
      () => selectFrom('t', {
        were: eq(col('a'), 1),
      } as never),
      '[fundamentool/sql] selectFrom: unknown option "were". Did you mean "where"?',
    ],
    [
      'jsonGet with a quote in a key, at compile',
      () => compiler.compile(jsonGet(col('a'), 'x"y')),
      'a key with " can\'t be in a SQLite JSON path',
    ],
  ])('%s', (
    _name, build, text,
  ) => {
    expect(build).toThrow(text);
  });

  test('isSqlNode: a node, not a value', () => {
    expect(isSqlNode(col('a'))).toBe(true);
    expect(isSqlNode(new Uint8Array([1]))).toBe(false);
    expect(isSqlNode([])).toBe(false);
    expect(isSqlNode(null)).toBe(false);
    expect(isSqlNode({
      kind: 1,
    })).toBe(false);
    expect(asc(col('a')).of).toEqual(col('a'));
  });
});

describe('dialects as presets (S5, S14)', () => {
  test('a later preset is asked first and reaches the one it replaced with c.base', () => {
    const upper: TSqlPreset = {
      name: 'upper',
      requires: ['sqlite'],
      setup(d) {
        d.node('raw', (node, c) => (node.text === 'x' ? c.base(raw('X')) : c.base()));
      },
    };
    const compile = sqlCompiler({
      presets: [
        upper,
        sqlite,
      ],
    });
    expect(compile.compile(and(raw('x'), raw('y'))).text).toBe('(X) AND (y)');
  });

  test('a preset brings a kind of its own; a function preset too', () => {
    const compile = sqlCompiler({
      presets: [(d) => d.node('now', () => 'CURRENT_TIMESTAMP')],
    });
    expect(compile.compile(selectFrom('t', {
      columns: [
        {
          kind: 'now',
        },
      ],
    })).text).toBe('SELECT CURRENT_TIMESTAMP FROM "t"');
  });

  test('a primitive replaced: ident and literal; ident on the compiler for hand-written SQL', () => {
    const compile = sqlCompiler({
      presets: [
        sqlite,
        sqlDialect({
          name: 'backticks',
          setup(d) {
            d.primitive('ident', (name) => `\`${name}\``);
            d.primitive('literal', (value, next) => (value === '$' ? '\'$$\'' : next()));
          },
        }),
      ],
    });
    expect(compile.compile(jsonGet(col('a'), [])).text).toBe('json_extract(`a`, \'$$\')');
    expect(compile.compile(jsonGet(col('a'), 'b')).text).toBe('json_extract(`a`, \'$.b\')');
    expect(compile.ident('units')).toBe('`units`');
    expect(base.ident('a"b')).toBe('"a""b"');
  });

  test('the functions a dialect declares', () => {
    expect(Object.keys(compiler.functions)).toEqual([
      'fundamentool_lower',
      'fundamentool_regexp',
    ]);
    expect(base.functions).toEqual({});
  });

  test('a preset requiring one not given: the error orderPresets gives', () => {
    expect(() => sqlCompiler({
      presets: [
        {
          name: 'fts',
          requires: ['sqlite'],
          setup() {},
        },
      ],
    })).toThrow('[fundamentool/sql] sqlCompiler: fts requires "sqlite", which is not connected');
  });

  test('the host\'s own checks', () => {
    expect(() => sqlCompiler({
      presets: [(d) => d.node('', () => '')],
    })).toThrow('d.node(kind, handler) expects a kind and a function');
    expect(() => sqlCompiler({
      presets: [(d) => d.node('x', 'y' as never)],
    })).toThrow('d.node(kind, handler) expects a kind and a function');
    expect(() => sqlCompiler({
      presets: [(d) => d.primitive('parm' as never, (() => '') as never)],
    })).toThrow('[fundamentool/sql] sqlCompiler: unknown primitive "parm". Did you mean "param"? Primitives: param, ident, literal, value');
    expect(() => sqlCompiler({
      presets: [(d) => d.primitive('zzzzzz' as never, (() => '') as never)],
    })).toThrow('unknown primitive "zzzzzz". Primitives:');
    expect(() => sqlCompiler({
      presets: [(d) => d.function('a-b', () => 1)],
    })).toThrow('d.function(name, fn) expects a word and a function');
    expect(() => sqlCompiler({
      presets: [(d) => d.function('ab', 1 as never)],
    })).toThrow('d.function(name, fn) expects a word and a function');
    expect(() => sqlDialect({
      name: 'x',
    } as never)).toThrow('[fundamentool/sql] sqlDialect');
    expect(() => sqlCompiler({
      preset: [],
    } as never)).toThrow('[fundamentool/sql] sqlCompiler: unknown option "preset". Did you mean "presets"?');
  });
});

describe('errors where they happened', () => {
  test('an unknown node, with the nearest known kind', () => {
    expect(() => compiler.compile({
      kind: 'selct',
    })).toThrow(/^\[fundamentool\/sql\] compile: no handler for the node "selct"\. Did you mean "select"\? Nodes: column, param, .*json-get/);
    expect(() => compiler.compile({
      kind: 'qqqqqqqq',
    })).toThrow(/no handler for the node "qqqqqqqq"\. Nodes:/);
  });

  test('an operator node without its path', () => {
    expect(() => base.compile({
      kind: 'match:$x',
    })).toThrow('no SQL for the operator "$x" at the top');
  });

  test('a hand-made upsert with no columns to take does nothing', () => {
    expect(base.compile({
      ...insertInto('t', {
        values: {
          a: 1,
        },
        onConflict: {
          target: ['a'],
          nothing: true,
        },
      }),
      onConflict: {
        target: ['a'],
      },
    }).text).toBe('INSERT INTO "t" ("a") VALUES (?) ON CONFLICT ("a") DO NOTHING');
  });

  test('not a node', () => {
    expect(() => compiler.compile('SELECT 1' as never)).toThrow('[fundamentool/sql] compile: expects a node { kind, … }, got');
  });

  test('a handler\'s throw is named by the hook and the preset — once, however deep', () => {
    const broken = sqlCompiler({
      presets: [
        {
          name: 'broken',
          setup(d) {
            d.node('json-get', () => {
              throw new Error('no JSON here');
            });
          },
        },
      ],
    });
    expect(() => broken.compile(selectFrom('t', {
      where: and(eq(jsonGet(col('a'), 'b'), 1)),
    }))).toThrow(/^\[fundamentool\/sql\] node "json-get": the handler of broken threw: no JSON here$/);
  });

  test('an unknown child: its own message, not wrapped by the parents', () => {
    expect(() => compiler.compile(selectFrom('t', {
      where: and({
        kind: 'nope',
      }),
    }))).toThrow(/^\[fundamentool\/sql\] compile: no handler for the node "nope"/);
  });

  test('c.base() with no handler below', () => {
    const lonely = sqlCompiler({
      presets: [(d) => d.node('lonely', (_node, c) => c.base())],
    });
    expect(() => lonely.compile({
      kind: 'lonely',
    })).toThrow('[fundamentool/sql] node "lonely": c.base() — no handler below this one');
    const deeper = sqlCompiler({
      presets: [
        (d) => d.node('raw', (_node, c) => c.base({
          kind: 'raw',
          text: 'a',
        })),
      ],
    });
    expect(deeper.compile(raw('b')).text).toBe('a');
  });

  test('a primitive\'s throw is kept as it was', () => {
    const strict = sqlCompiler({
      presets: [
        {
          name: 'strict',
          setup(d) {
            d.primitive('ident', () => {
              throw new Error('no names');
            });
          },
        },
      ],
    });
    expect(() => strict.compile(col('a'))).toThrow('[fundamentool/sql] primitive "ident": the handler of strict threw: no names');
  });

  test('literal and ident refuse what they can\'t write', () => {
    const literal = sqlCompiler({
      presets: [(d) => d.node('lit', (node, c) => c.literal(node.value as never))],
    });
    expect(literal.compile({
      kind: 'lit',
      value: 3,
    }).text).toBe('3');
    expect(() => literal.compile({
      kind: 'lit',
      value: Infinity,
    })).toThrow('[fundamentool/sql] literal: expects a string or a finite number, got');
    expect(() => base.ident('')).toThrow('[fundamentool/sql] ident: expects a name');
  });

  test('a compile inside a handler keeps its own state', () => {
    const nested = sqlCompiler({
      presets: [(d) => d.node('inner', (_node, c) => `${c.param(1)}:${nested.compile(eq(col('a'), 2)).params.join()}`)],
    });
    expect(nested.compile({
      kind: 'inner',
    })).toEqual({
      text: '?:2',
      params: [1],
      names: [undefined],
    });
  });
});
