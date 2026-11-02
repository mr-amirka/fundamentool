import {
  and,
  col,
  eq,
  insertInto,
  jsonGet,
  param,
  selectFrom,
  sqlCompiler,
  sqlDialect,
  type TJsonGetNode,
} from '../../src/sql';

/**
 * PostgreSQL as a dialect in the tests only (card choice P8): the split between the base and a dialect proven with no
 * edit to the core — `$n` placeholders and `->>` / `#>>` for JSON.
 */
const postgres = sqlDialect({
  name: 'postgres',
  setup(d) {
    d.primitive('param', (index) => `$${index + 1}`);
    d.node('json-get', (node: TJsonGetNode, c) => (node.path.length === 1
      ? `${c.compile(node.of)}->>${c.literal(node.path[0])}`
      : `${c.compile(node.of)}#>>${c.literal(`{${node.path.join(',')}}`)}`));
  },
});

const compiler = sqlCompiler({
  presets: [postgres],
});

describe('a PostgreSQL dialect over the shared base', () => {
  test('placeholders by number, in text order; JSON by ->>', () => {
    const query = compiler.compile(selectFrom('nodes', {
      where: and(eq(jsonGet(col('attrs'), 'status'), 'proposed'), eq(col('file'), param('file'))),
      limit: 5,
    }));
    expect(query.text).toBe('SELECT * FROM "nodes" WHERE "attrs"->>\'status\' = $1 AND "file" = $2 LIMIT $3');
    expect(compiler.bind(query, {
      file: 'a.md',
    })).toEqual([
      'proposed',
      'a.md',
      5,
    ]);
  });

  test('a deeper path by #>>; an offset alone stays alone; a boolean bound as it is', () => {
    expect(compiler.compile(selectFrom('t', {
      columns: [
        jsonGet(col('a'), [
          'b',
          'c',
        ]),
      ],
      where: eq(col('done'), true),
      offset: 3,
    }))).toEqual({
      text: 'SELECT "a"#>>\'{b,c}\' FROM "t" WHERE "done" = $1 OFFSET $2',
      params: [
        true,
        3,
      ],
      names: [
        undefined,
        undefined,
      ],
    });
  });

  test('the upsert both share', () => {
    expect(compiler.compile(insertInto('files', {
      values: {
        path: param('path'),
        mtime: param('mtime'),
      },
      onConflict: {
        target: ['path'],
        update: ['mtime'],
      },
      returning: ['path'],
    })).text).toBe('INSERT INTO "files" ("path", "mtime") VALUES ($1, $2) ON CONFLICT ("path") DO UPDATE SET "mtime" = excluded."mtime" RETURNING "path"');
  });
});
