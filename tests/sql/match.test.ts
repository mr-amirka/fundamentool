import {
  STANDARD_OPERATORS,
  matchProvider,
  type TMatch,
} from '../../src/match';
import {
  col,
  jsonGet,
  matchWhere,
  selectFrom,
  sqlCompiler,
  sqlite,
  type TSqlNode,
} from '../../src/sql';
import {
  DRIVERS,
  adapterOf,
} from './drivers';

/** Rows as JSON: arrays, absent and null fields, every type, Cyrillic, nested objects. */
const ROWS: Record<string, unknown>[] = [
  {
    id: 1,
    kind: 'decision',
    status: 'proposed',
    tags: [
      'a',
      'b',
    ],
    n: 3,
    done: true,
    title: 'Минута Done',
    meta: {
      level: 2,
    },
  },
  {
    id: 2,
    kind: 'plan',
    status: 'active',
    tags: [],
    n: 3.5,
    done: false,
    title: 'plan two',
    meta: {
      level: 'high',
    },
  },
  {
    id: 3,
    kind: 'decision',
    status: null,
    tags: [
      'b',
      3,
      null,
      true,
    ],
    n: '3',
    title: 'ABC',
  },
  {
    id: 4,
    kind: 'note',
    n: [
      1,
      10,
    ],
    tags: 'a',
    done: 1,
    extra: {},
  },
  {
    id: 5,
  },
  {
    id: 6,
    kind: 'decision',
    status: 'provisional',
    tags: ['A'],
    n: -1,
    title: [
      'x',
      'Минус',
    ],
    meta: null,
    list: [[1]],
  },
  {
    id: 7,
    kind: 'x',
    n: 0,
    title: '',
    status: [
      'proposed',
      'done',
    ],
  },
];

/** Every operator, shorthands, and logic — each also run under `$not`. */
const PATTERNS: TMatch[] = [
  {
    kind: 'decision',
  },
  {
    kind: [
      'decision',
      'plan',
    ],
  },
  {
    status: null,
  },
  {
    status: undefined,
  },
  {
    tags: 'a',
  },
  {
    tags: 3,
  },
  {
    tags: null,
  },
  {
    tags: true,
  },
  {
    n: 3,
  },
  {
    n: {
      $gt: 3,
    },
  },
  {
    n: {
      $gte: 3,
    },
  },
  {
    n: {
      $lt: 3,
    },
  },
  {
    n: {
      $lte: 0,
    },
  },
  {
    n: {
      $gt: 5,
    },
  },
  {
    n: {
      $gte: 1,
      $lt: 5,
    },
  },
  {
    status: {
      $gt: 'p',
    },
  },
  {
    title: {
      $lt: 'b',
    },
  },
  {
    done: true,
  },
  {
    done: false,
  },
  {
    done: 1,
  },
  {
    title: {
      $has: 'минут',
    },
  },
  {
    title: {
      $has: 'DONE',
    },
  },
  {
    title: {
      $has: '',
    },
  },
  {
    tags: {
      $has: 'a',
    },
  },
  {
    tags: {
      $has: 3,
    },
  },
  {
    tags: {
      $has: null,
    },
  },
  {
    title: /^m/i,
  },
  {
    title: {
      $regex: ['two$'],
    },
  },
  {
    title: {
      $regex: [
        'ус$',
        'gi',
      ],
    },
  },
  {
    tags: /^[ab]$/,
  },
  {
    status: {
      $exists: true,
    },
  },
  {
    status: {
      $exists: false,
    },
  },
  {
    meta: {
      $exists: true,
    },
  },
  {
    n: {
      $type: 'string',
    },
  },
  {
    n: {
      $type: [
        'number',
        'array',
      ],
    },
  },
  {
    meta: {
      $type: 'null',
    },
  },
  {
    meta: {
      $type: 'undefined',
    },
  },
  {
    done: {
      $type: 'boolean',
    },
  },
  {
    extra: {
      $type: 'object',
    },
  },
  {
    n: {
      $type: 'bigint',
    },
  },
  {
    meta: {},
  },
  {
    meta: {
      level: 2,
    },
  },
  {
    meta: {
      level: {
        $type: 'string',
      },
    },
  },
  {
    status: {
      $ne: 'proposed',
    },
  },
  {
    status: {
      $in: [],
    },
  },
  {
    status: {
      $in: [
        'proposed',
        null,
      ],
    },
  },
  {
    tags: {
      $in: [
        3,
        'b',
        true,
        undefined,
      ],
    },
  },
  {
    list: 1,
  },
  [],
  [
    {
      kind: 'plan',
    },
    {
      n: {
        $lt: 0,
      },
    },
  ],
  {
    $or: [
      {
        kind: 'note',
      },
      {
        done: true,
      },
    ],
    status: {
      $exists: false,
    },
  },
  {
    kind: 'decision',
    $not: {
      tags: 'b',
    },
  },
  {},
];

const field = (path: readonly string[]): TSqlNode => jsonGet(col('doc'), path);

const idsOf = (rows: unknown[]): number[] => rows.map((row) => (row as { id: number }).id);

describe.each(DRIVERS)('matchWhere gives the rows matchProvider gives — JSON, %s (B12)', (_name, open) => {
  const db = adapterOf(open);
  beforeAll(async () => {
    await db.exec('CREATE TABLE docs (id INTEGER PRIMARY KEY, doc TEXT)');
    const insert = db.prepare({
      text: 'INSERT INTO docs (id, doc) VALUES (?, ?)',
      params: [
        undefined,
        undefined,
      ],
      names: [
        'id',
        'doc',
      ],
    });
    for (const row of ROWS) {
      await insert.run({
        id: row.id,
        doc: JSON.stringify(row),
      });
    }
  });
  const sqlIds = async (pattern: TMatch): Promise<number[]> => idsOf(await db.prepare(selectFrom('docs', {
    columns: ['id'],
    where: matchWhere(pattern, {
      field,
    }),
    orderBy: ['id'],
  })).all());

  test.each(PATTERNS.map((pattern) => [
    JSON.stringify(pattern, (_key, value) => (value instanceof RegExp ? String(value) : value === undefined ? '(undefined)' : value)),
    pattern,
  ]))('%s and its $not', async (_text, pattern) => {
    const predicate = matchProvider(pattern);
    expect(await sqlIds(pattern)).toEqual(idsOf(ROWS.filter(predicate)));
    expect(await sqlIds({
      $not: pattern,
    })).toEqual(idsOf(ROWS.filter((row) => !predicate(row))));
  });
});

/** Rows of columns as the drivers read them: no booleans, NULL for null, a blob as a Uint8Array. */
describe.each(DRIVERS)('matchWhere on columns, %s', (_name, open) => {
  const db = adapterOf(open);
  let rows: unknown[] = [];
  beforeAll(async () => {
    await db.exec('CREATE TABLE cols (id INTEGER PRIMARY KEY, kind TEXT, n)');
    await db.exec(`INSERT INTO cols (id, kind, n) VALUES (1, 'a', 5), (2, 'A', '5'), (3, NULL, 2.5), (4, 'Минута', NULL),
      (5, 'b', x'01')`);
    rows = await db.prepare(selectFrom('cols', {
      orderBy: ['id'],
    })).all();
  });
  const sqlIds = async (pattern: TMatch): Promise<number[]> => idsOf(await db.prepare(selectFrom('cols', {
    columns: ['id'],
    where: matchWhere(pattern, {
      field: (path) => col(path[0]),
    }),
    orderBy: ['id'],
  })).all());

  test.each<[string, TMatch]>([
    [
      'a text',
      {
        kind: 'a',
      },
    ],
    [
      'a number, not its text (no affinity on the way)',
      {
        n: 5,
      },
    ],
    [
      'a text, not the number',
      {
        n: '5',
      },
    ],
    [
      'null',
      {
        kind: null,
      },
    ],
    [
      'a list',
      {
        kind: [
          'a',
          'b',
          null,
        ],
      },
    ],
    [
      'greater',
      {
        n: {
          $gt: 3,
        },
      },
    ],
    [
      'has, Cyrillic',
      {
        kind: {
          $has: 'минут',
        },
      },
    ],
    [
      'a RegExp',
      {
        kind: /^a$/i,
      },
    ],
    [
      'types',
      {
        n: {
          $type: [
            'string',
            'object',
          ],
        },
      },
    ],
    [
      'null by type',
      {
        n: {
          $type: 'null',
        },
      },
    ],
  ])('%s and its $not', async (_text, pattern) => {
    const predicate = matchProvider(pattern);
    expect(await sqlIds(pattern)).toEqual(idsOf(rows.filter(predicate)));
    expect(await sqlIds({
      $not: pattern,
    })).toEqual(idsOf(rows.filter((row) => !predicate(row))));
  });

  test('a column can\'t tell null from absent: $exists means "not NULL", undefined means NULL (documented)', async () => {
    expect(await sqlIds({
      kind: {
        $exists: true,
      },
    })).toEqual([
      1,
      2,
      4,
      5,
    ]);
    expect(await sqlIds({
      kind: undefined,
    })).toEqual([3]);
    expect(await sqlIds({
      kind: {
        $type: 'undefined',
      },
    })).toEqual([3]);
  });
});

describe('what can\'t agree is refused, never approximated', () => {
  const compiler = sqlCompiler({
    presets: [sqlite],
  });
  const json = (pattern: TMatch) => () => compiler.compile(matchWhere(pattern, {
    field,
  }));
  const column = (pattern: TMatch) => () => compiler.compile(matchWhere(pattern, {
    field: (path) => col(path[0]),
  }));

  test.each<[string, () => unknown, string]>([
    [
      'a Date',
      json({
        due: {
          $gt: new Date(0),
        },
      }),
      '[fundamentool/sql] node "match:$gt": the handler of sqlite threw: "$gt" at due: a Date can\'t be compared in SQL — pass what the field stores: date.getTime() or date.toISOString()',
    ],
    [
      'a bigint',
      json({
        n: 1n,
      }),
      '"$eq" at n: a bigint can\'t be compared in SQL — pass a number',
    ],
    [
      'NaN',
      json({
        n: NaN,
      }),
      'NaN is never stored in JSON or SQL',
    ],
    [
      'a symbol',
      json({
        n: Symbol('n') as never,
      }),
      '"$eq" at n: can\'t compare with',
    ],
    [
      'an object compared whole',
      json({
        n: {
          $eq: {
            a: 1,
          },
        },
      }),
      'SQL compares whole scalars only',
    ],
    [
      'an object in a list',
      json({
        n: {
          $in: [
            {
              a: 1,
            },
          ],
        },
      }),
      '"$in" at n: SQL compares whole scalars only',
    ],
    [
      'an object to $has',
      json({
        n: {
          $has: {
            a: 1,
          },
        },
      }),
      '"$has" at n: SQL compares whole scalars only',
    ],
    [
      'a boolean on a column',
      column({
        done: true,
      }),
      '"$eq" at done: a column has no booleans — compare with 1 or 0, as it stores them',
    ],
    [
      'a boolean in a list on a column',
      column({
        done: {
          $in: [true],
        },
      }),
      'a column has no booleans',
    ],
    [
      '$type boolean on a column',
      column({
        done: {
          $type: 'boolean',
        },
      }),
      '"$type" at done: a column has no booleans',
    ],
    [
      '$type bigint on a column',
      column({
        n: {
          $type: 'bigint',
        },
      }),
      'read as a number or a bigint by the driver\'s settings',
    ],
    [
      'a custom operator no dialect writes',
      () => compiler.compile(matchWhere({
        edited: {
          $within: '2h',
        },
      }, {
        field,
        operators: {
          ...STANDARD_OPERATORS,
          $within: {
            test: () => true,
          },
        },
      })),
      '[fundamentool/sql] compile: no SQL for the operator "$within" at edited — a dialect preset adds it with d.node(\'match:$within\', …)',
    ],
    [
      'a field field() doesn\'t know',
      () => matchWhere({
        a: {
          b: 1,
        },
      }, {
        field: () => undefined,
      }),
      '[fundamentool/sql] matchWhere: no field for "a.b" — field(path) returned undefined',
    ],
    [
      'a top-level pattern field() doesn\'t know',
      () => matchWhere(1, {
        field: () => undefined,
      }),
      'no field for the top',
    ],
    [
      'a bad pattern: normalizeMatch\'s error',
      () => matchWhere({
        a: {
          $eqq: 1,
        },
      }, {
        field,
      }),
      'unknown operator "$eqq" at a. Did you mean "$eq"?',
    ],
    [
      'an unknown option, in development',
      () => matchWhere({}, {
        feld: field,
      } as never),
      '[fundamentool/sql] matchWhere: unknown option "feld"',
    ],
  ])('%s', (
    _name, run, text,
  ) => {
    expect(run).toThrow(text);
  });

  test('a custom operator a preset writes', () => {
    const withWithin = sqlCompiler({
      presets: [
        sqlite,
        {
          name: 'within',
          requires: ['sqlite'],
          setup(d) {
            d.node('match:$within', (node, c) => `${c.compile(node.field)} > ${c.param(node.argument)}`);
          },
        },
      ],
    });
    expect(withWithin.compile(matchWhere({
      edited: {
        $within: 5,
      },
    }, {
      field: (path) => col(path[0]),
      operators: {
        ...STANDARD_OPERATORS,
        $within: {
          test: () => true,
        },
      },
    }))).toEqual({
      text: '"edited" > ?',
      params: [5],
      names: [undefined],
    });
  });

  test('a field is asked for once per path', () => {
    const asked: string[] = [];
    matchWhere({
      a: {
        $gt: 1,
        $lt: 5,
      },
      b: 1,
    }, {
      field: (path) => {
        asked.push(path.join('.'));
        return col(path[0]);
      },
    });
    expect(asked).toEqual([
      'a',
      'b',
    ]);
  });
});

describe.each(DRIVERS)('the known gaps, %s (documented: SQL reads one level of an array)', (_name, open) => {
  const db = adapterOf(open);
  beforeAll(async () => {
    await db.exec('CREATE TABLE docs (id INTEGER PRIMARY KEY, doc TEXT)');
    await db.exec('INSERT INTO docs VALUES (1, \'{"tags":[["x"]],"items":[{"id":1}]}\')');
  });
  const count = async (pattern: TMatch): Promise<number> => (await db.prepare(selectFrom('docs', {
    where: matchWhere(pattern, {
      field,
    }),
  })).all()).length;

  test('$has in a nested array: matchProvider finds it, SQL doesn\'t', async () => {
    expect(matchProvider({
      tags: {
        $has: 'x',
      },
    })({
      tags: [['x']],
    })).toBe(true);
    expect(await count({
      tags: {
        $has: 'x',
      },
    })).toBe(0);
  });

  test('a path through an array of objects: matchProvider reaches each, SQL doesn\'t', async () => {
    expect(matchProvider({
      items: {
        id: 1,
      },
    })({
      items: [
        {
          id: 1,
        },
      ],
    })).toBe(true);
    expect(await count({
      items: {
        id: 1,
      },
    })).toBe(0);
  });
});
