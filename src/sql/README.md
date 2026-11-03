# sql — a query as data, dialects as presets, drivers by shape

[Русская версия](./README.ru.md)

`fundamentool/sql` (fundamentool D-088, D-093, lab D-042, D-046) has four parts:
- builders that return plain nodes;
- `matchWhere`, which turns a `fundamentool/match` pattern into a condition that gives the same rows;
- a compiler whose node kinds are `fundamentool/hooks` chains, so a dialect is a preset;
- `sqliteAdapter`, one async shape over better-sqlite3 and `node:sqlite`.

Every value is a parameter and every name is quoted. The builders, `matchWhere` and the compiler are sync — pure work;
the adapter is async, so a driver that waits (a Worker, PostgreSQL) fits under it with no caller changed (lab D-046).

```ts
import Database from 'better-sqlite3';
import { selectFrom, insertInto, deleteFrom, col, param, eq, and, asc, jsonGet, matchWhere,
  sqliteAdapter, sqliteFts5 } from 'fundamentool/sql';

const db = sqliteAdapter(new Database(file), { presets: [sqliteFts5] });  // or new DatabaseSync(file)
await db.pragma('journal_mode', 'wal');         // => 'wal' — the value read back
await db.migrate([
  { version: 1, up: (m) => m.exec('CREATE TABLE nodes (id INTEGER PRIMARY KEY, file TEXT, type TEXT, attrs TEXT)') },
]);

const ofFile = db.prepare<TNode>(selectFrom('nodes', {
  where: eq(col('file'), param('file')),        // a named parameter: compiled once, bound per call
  orderBy: [asc('id')],
}));
await ofFile.all({ file: 'PLAN.md' });          // TNode[]

const open = db.prepare(selectFrom('nodes', {
  where: and(eq(col('type'), 'decision'), matchWhere(
    { status: ['proposed', 'provisional'], $not: { affects: { $has: 'USER_DRAFT' } } },
    { field: (path) => jsonGet(col('attrs'), path) },   // where a field of the pattern lives
  )),
}));

await db.transaction(async (tx) => {            // BEGIN … COMMIT; a rejection rolls back; nested — a savepoint
  await tx.prepare(deleteFrom('nodes', { where: eq(col('file'), param('file')) })).run({ file });
  return tx.prepare(ofFile).all({ file });      // a statement prepared on db, run in the transaction
}, { immediate: true });
```

## Members

| Member | What it is |
|--------|-----------|
| `selectFrom(from, { columns, distinct, where, groupBy, having, orderBy, limit, offset })` | A `SELECT` |
| `insertInto(table, { values, onConflict, returning })` | An `INSERT` of one row or several; `onConflict: { target, update }` or `{ target, nothing: true }` |
| `update(table, { set, where, returning })` | An `UPDATE`; a column set to `undefined` is left out |
| `deleteFrom(table, { where, returning })` | A `DELETE` |
| `col`, `param`, `raw`, `fn`, `valueNode` | A column (`'u.kind'` → `"u"."kind"`), a named parameter, trusted text, a call, a value |
| `and`, `or`, `not`, `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `inList`, `like`, `isNull` | Conditions; `eq(x, null)` is an error (`isNull` is the form) |
| `jsonGet(of, path)`, `alias`, `asc`, `desc`, `table`, `join`, `leftJoin` | A JSON field, a named column, order, sources of rows |
| `matchWhere(pattern, { field, operators? })` | A `match` pattern as a condition with the same rows as `matchProvider` |
| `sqlCompiler({ presets })` | `compile(node)` → `{ text, params, names }`, `bind(compiled, values)`, `ident(name)`, `functions` |
| `sqlDialect({ name, requires?, setup(d) })` | A dialect or a preset over one, checked |
| `sqlite`, `sqliteFts5`, `textMatch`, `fts5Query` | The SQLite dialect, FTS5's `MATCH` over it, FTS5's query text from words |
| `sqliteAdapter(instance, { presets })` | `prepare` (sync) → `all` / `get` / `run` / `iterate`; `exec`, `transaction`, `migrate`, `pragma`, `tableColumns` — each a promise; `compiler`, `instance` |
| `sqliteErrorCode(error)` | `SQLITE_BUSY`, `SQLITE_CONSTRAINT_PRIMARYKEY`, … — from either driver |

## A value is a parameter

In an expression position a JS value becomes a parameter: `eq(col('kind'), 'decision')` → `"kind" = ?` with params
`['decision']`. The dialect's `value` primitive decides how it is bound:
- strings, numbers, bigints, `null` and `Uint8Array`s pass;
- `true` / `false` become `1` / `0` in SQLite;
- a `Date` is refused: `a Date can't be bound — pass date.getTime() or date.toISOString(), as the column stores it`. A
  date stored one way and compared another would match nothing, silently;
- `undefined` is refused: `leave the column out, or pass null`.

`raw(text)` is for text no node writes, and never for a value.

## Compile once, bind per call

```ts
const compiler = sqlCompiler({ presets: [sqlite] });
const q = compiler.compile(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
// { text: 'SELECT * FROM "nodes" WHERE "file" = ?', params: [undefined], names: ['file'] }
compiler.bind(q, { file: 'PLAN.md' });  // => ['PLAN.md']
compiler.bind(q, { fiel: 'x' });        // TypeError: … bind: no value for "file"
```

`db.prepare(node)` does both: it compiles and prepares once, and each `all` / `get` / `run` / `iterate` only binds. An
unknown name is an error with the nearest known one.

## `matchWhere`: the same rows as in memory

SQL differs from JavaScript in four places, and the SQLite dialect writes each of them as `match` means it:

| In memory | In SQL, naively | Written as |
|-----------|-----------------|------------|
| `{ tags: 'a' }` matches `tags: ['a', 'b']` | `= 'a'` is false | `CASE WHEN json_type(…) = 'array' THEN EXISTS (SELECT 1 FROM json_each(…) …) ELSE … END` |
| `$not` of an absent field is true | `NOT (NULL = ?)` drops the row | every leaf is two-valued: `CASE WHEN <type> THEN <test> ELSE 0 END` |
| `$gt: 3` never matches a string | text sorts above every number | the type is tested first |
| `{ done: true }` doesn't match `1` | `json_extract` gives `1` for `true` | `json_type(…) IS 'true'` |

Two functions do what SQLite's own can't. `fundamentool_lower` lowers Cyrillic too, for `$has`.
`fundamentool_regexp` runs a JS `RegExp`, with `g` / `y` dropped as `match` drops them. The adapter installs both.

A test runs every operator and its `$not` through `matchProvider` and through SQL over the same rows on both drivers,
and the two must give the same ids.

What can't agree is refused, never approximated:
- a `Date`, a `bigint` or `NaN` argument;
- an object compared whole;
- a boolean on a column — compare with `1` / `0`, as it stores them;
- a custom operator no preset writes: `no SQL for the operator "$within" at edited — a dialect preset adds it with
  d.node('match:$within', …)`.

Known gaps, documented and tested:
- SQL reads one level of an array: `$has` doesn't search a nested array, and a path through an array of objects
  (`{ items: { id: 1 } }` on `items: [{ id: 1 }]`) isn't reached;
- a numeric segment of a path is a key, never an index;
- a column can't tell `null` from absent: `$exists` means "not NULL", and `undefined` means NULL;
- text is ordered by UTF-8 bytes in SQLite and by UTF-16 code units in JS. They agree except between characters above
  U+FFFF and those from U+E000 to U+FFFF.

## Dialects as presets

```ts
const postgres = sqlDialect({ name: 'postgres', setup(d) {
  d.primitive('param', (index) => `$${index + 1}`);
  d.node('json-get', (n, c) => `${c.compile(n.of)}->>${c.literal(n.path[0])}`);
} });
```

The base writes the forms SQLite and PostgreSQL share: `LIMIT`, `ON CONFLICT`, `RETURNING`, `"` quoting.

- **Node kinds.** Each kind is a chain. A later preset is asked first, and `c.base(node?)` reaches the handler it
  replaced. That is how `sqlite` writes `LIMIT -1` before an `OFFSET` that has no limit.
- **Primitives.** `param`, `ident`, `literal` and `value` are chains too.
- **Order.** Presets are ordered by `orderPresets`: `sqliteFts5` requires `sqlite`.
- **Inside a handler,** `c` gives `compile`, `param`, `named`, `ident`, `literal`, `list` and `base`.
- **Errors** are reported once, where they happened:
  - an unknown kind says "did you mean";
  - a handler's throw is named by the node and the preset: `[fundamentool/sql] node "json-get": the handler of
    postgres threw: …`.

## The adapter

- **One at a time.** The connection runs its operations in the order they were called. While a transaction runs, other
  code's statements wait for its `COMMIT`, so they never land inside it:

  ```ts
  const refresh = db.transaction(async (tx) => { await tx.prepare(forgetFile).run({ file }); await parseAgain(file); … });
  const found = db.prepare(find).all({ query });  // waits: runs after refresh's COMMIT, sees the new rows
  ```
- **Transactions.** The adapter writes them itself for both drivers (`BEGIN [IMMEDIATE]`, `SAVEPOINT` when nested), so
  they behave alike. The function may be sync or async; it gets the transaction's session `tx` and runs its statements
  through it — `tx.prepare(statement)` takes one prepared on `db`, with nothing compiled or prepared again. `COMMIT`
  waits for what the function left running on `tx`; a rejection or a failed `COMMIT` rolls back and is passed on. `tx`
  after its function settled is an error: *"this transaction is over"*.
- **`db` inside the function is an error** (fundamentool D-094). A statement on `db` there would wait for the
  transaction, and the transaction for the function — it would never settle. So it is rejected at once, naming the fix:

  ```ts
  await db.transaction(async (tx) => {
    await tx.prepare(forgetFile).run({ file });   // tx — inside the transaction
    return db.prepare(ofFile).all({ file });      // rejects: "… run it on the transaction's own session: tx.prepare(…)"
  });                                             // and the transaction rolls back, as for any error in it
  ```

  The same for `db.transaction`, `db.exec` and the rest, and for an outer `tx` inside a nested transaction. Other
  code's statements still wait, as above: the adapter tells them apart by Node's `AsyncLocalStorage` (the call chain
  the function was started in). Once the function settled, what it left behind (a timer) may use `db`. Where
  `AsyncLocalStorage` can't be reached (Node before 22.3, a browser), the check is off and such a call waits forever.
  Code that runs there has its tests run in Node, where the check is on, so a test that runs the call finds the
  mistake.
- **`iterate`** waits for its turn to start, then streams without holding the connection: better-sqlite3 refuses
  another statement on it until the loop ends (*"busy executing a query"*); `node:sqlite` runs it.
- **Migrations.** Versions are whole numbers from 1, ascending. Each `up(m)` runs in its own transaction (`m` is its
  session; `up` may be async), and `PRAGMA
  user_version` keeps the last one. A failure rolls back that version and is rethrown with its number. A database newer
  than the list is an error.
- **`pragma(name, value?)`** reads the pragma, or sets it and reads it back. A name is a word, and a value is a number,
  a boolean or a word, because a pragma can't take a parameter.
- **Driver differences** it can't fix per query:
  - a `bigint` above 2⁵³ is rounded by better-sqlite3 without `safeIntegers`, and refused by `node:sqlite`;
  - `node:sqlite`'s rows have a `null` prototype.

## Not here

- An adapter for a driver that waits (`pg`, a Worker): the port is ready for one; no consumer yet.
- A row mapper: an entity layer above this module.
- DDL as a tree: a schema is SQL text through `exec`, and its changes are migrations.

The design card is `LABARATORY/PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/SPEC/sql.md`.
