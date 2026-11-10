# sql — запрос как данные, диалекты как пресеты, драйверы по форме

[English version](./README.md)

В `fundamentool/sql` (fundamentool D-088, D-093, lab D-042, D-046) четыре части:
- построители, возвращающие простые узлы;
- `matchWhere` — превращает шаблон `fundamentool/match` в условие, дающее те же строки;
- компилятор, у которого каждый вид узла — цепочка `fundamentool/hooks`, поэтому диалект — это пресет;
- `sqliteAdapter` — одна асинхронная форма поверх better-sqlite3 и `node:sqlite`.

## Когда нужен

- Строить SQL-запросы как данные — select, insert, update, delete, — каждое значение параметр, каждое имя в кавычках:
  без инъекций.
- Одно async-API над SQLite (better-sqlite3 или `node:sqlite` из Node): транзакции, миграции по версиям,
  подготовленные запросы, pragma.
- Фильтр `fundamentool/match` как условие `WHERE`; полнотекстовый поиск (FTS5).
- Диалект SQL, добавленный пресетом.

Каждое значение — параметр, каждое имя — в кавычках. Построители, `matchWhere` и компилятор синхронны — это чистая
работа; адаптер асинхронный, поэтому под него встаёт драйвер, который ждёт (Worker, PostgreSQL), и ни один вызов не
меняется (lab D-046).

```ts
import Database from 'better-sqlite3';
import { selectFrom, insertInto, deleteFrom, col, param, eq, and, asc, jsonGet, matchWhere,
  sqliteAdapter, sqliteFts5 } from 'fundamentool/sql';

const db = sqliteAdapter(new Database(file), { presets: [sqliteFts5] });  // или new DatabaseSync(file)
await db.pragma('journal_mode', 'wal');         // => 'wal' — значение, прочитанное обратно
await db.migrate([
  { version: 1, up: (m) => m.exec('CREATE TABLE nodes (id INTEGER PRIMARY KEY, file TEXT, type TEXT, attrs TEXT)') },
]);

const ofFile = db.prepare<TNode>(selectFrom('nodes', {
  where: eq(col('file'), param('file')),        // именованный параметр: компилируется раз, связывается на каждый вызов
  orderBy: [asc('id')],
}));
await ofFile.all({ file: 'PLAN.md' });          // TNode[]

const open = db.prepare(selectFrom('nodes', {
  where: and(eq(col('type'), 'decision'), matchWhere(
    { status: ['proposed', 'provisional'], $not: { affects: { $has: 'USER_DRAFT' } } },
    { field: (path) => jsonGet(col('attrs'), path) },   // где лежит поле шаблона
  )),
}));

await db.transaction(async (tx) => {            // BEGIN … COMMIT; отказ — откат; вложенная — точка сохранения
  await tx.prepare(deleteFrom('nodes', { where: eq(col('file'), param('file')) })).run({ file });
  return tx.prepare(ofFile).all({ file });      // запрос, подготовленный на db, выполняется в транзакции
}, { immediate: true });
```

## Члены

| Член | Что это |
|------|---------|
| `selectFrom(from, { columns, distinct, where, groupBy, having, orderBy, limit, offset })` | `SELECT` |
| `insertInto(table, { values, onConflict, returning })` | `INSERT` одной строки или нескольких; `onConflict: { target, update }` или `{ target, nothing: true }` |
| `update(table, { set, where, returning })` | `UPDATE`; столбец со значением `undefined` пропускается |
| `deleteFrom(table, { where, returning })` | `DELETE` |
| `col`, `param`, `raw`, `fn`, `valueNode` | Столбец (`'u.kind'` → `"u"."kind"`), именованный параметр, доверенный текст, вызов, значение |
| `and`, `or`, `not`, `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `inList`, `like`, `isNull` | Условия; `eq(x, null)` — ошибка (форма для этого — `isNull`) |
| `jsonGet(of, path)`, `alias`, `asc`, `desc`, `table`, `join`, `leftJoin` | Поле JSON, столбец с именем, порядок, источники строк |
| `matchWhere(pattern, { field, operators? })` | Шаблон `match` как условие с теми же строками, что у `matchProvider` |
| `sqlCompiler({ presets })` | `compile(node)` → `{ text, params, names }`, `bind(compiled, values)`, `ident(name)`, `functions` |
| `sqlDialect({ name, requires?, setup(d) })` | Диалект или пресет над ним, с проверкой |
| `sqlite`, `sqliteFts5`, `textMatch`, `fts5Query`, `fts5Phrase` | Диалект SQLite, `MATCH` из FTS5 над ним, текст запроса FTS5 из слов и из фразы — её слов подряд, по порядку |
| `sqliteAdapter(instance, { presets })` | `prepare` (синхронно) → `all` / `get` / `run` / `iterate`; `exec`, `transaction`, `migrate`, `pragma`, `tableColumns` — каждый промис; `compiler`, `instance` |
| `sqliteErrorCode(error)` | `SQLITE_BUSY`, `SQLITE_CONSTRAINT_PRIMARYKEY`, … — от любого из драйверов |

## Значение — это параметр

Значение JS на месте выражения становится параметром: `eq(col('kind'), 'decision')` → `"kind" = ?` с параметрами
`['decision']`. Как его связать, решает примитив `value` диалекта:
- строки, числа, bigint, `null` и `Uint8Array` проходят;
- `true` / `false` в SQLite становятся `1` / `0`;
- `Date` отклоняется: `a Date can't be bound — pass date.getTime() or date.toISOString(), as the column stores it`. Дата,
  сохранённая одним способом и сравниваемая другим, молча ничего бы не нашла;
- `undefined` отклоняется: `leave the column out, or pass null`.

`raw(text)` — для текста, который не пишет ни один узел, и никогда не для значения.

## Компилировать раз, связывать на каждый вызов

```ts
const compiler = sqlCompiler({ presets: [sqlite] });
const q = compiler.compile(selectFrom('nodes', { where: eq(col('file'), param('file')) }));
// { text: 'SELECT * FROM "nodes" WHERE "file" = ?', params: [undefined], names: ['file'] }
compiler.bind(q, { file: 'PLAN.md' });  // => ['PLAN.md']
compiler.bind(q, { fiel: 'x' });        // TypeError: … bind: no value for "file"
```

`db.prepare(node)` делает и то и другое: компилирует и готовит запрос один раз, а каждый `all` / `get` / `run` /
`iterate` только связывает. Неизвестное имя — ошибка с ближайшим известным.

## `matchWhere`: те же строки, что в памяти

SQL расходится с JavaScript в четырёх местах, и диалект SQLite пишет каждое так, как это понимает `match`:

| В памяти | В SQL наивно | Пишется как |
|----------|--------------|-------------|
| `{ tags: 'a' }` подходит к `tags: ['a', 'b']` | `= 'a'` ложно | `CASE WHEN json_type(…) = 'array' THEN EXISTS (SELECT 1 FROM json_each(…) …) ELSE … END` |
| `$not` отсутствующего поля истинно | `NOT (NULL = ?)` выбрасывает строку | каждый лист двузначен: `CASE WHEN <тип> THEN <проверка> ELSE 0 END` |
| `$gt: 3` никогда не подходит к строке | текст сортируется выше любого числа | сначала проверяется тип |
| `{ done: true }` не подходит к `1` | `json_extract` даёт `1` для `true` | `json_type(…) IS 'true'` |

Две функции делают то, чего не умеют собственные функции SQLite. `fundamentool_lower` понижает регистр и у кириллицы —
для `$has`. `fundamentool_regexp` выполняет `RegExp` из JS без флагов `g` / `y`, как их отбрасывает `match`. Обе
устанавливает адаптер.

Тест прогоняет каждый оператор и его `$not` через `matchProvider` и через SQL над теми же строками на обоих драйверах,
и оба должны дать одни и те же id.

Что не может совпасть, отклоняется, а не приближается:
- аргумент `Date`, `bigint` или `NaN`;
- объект, сравниваемый целиком;
- булево значение на столбце — сравнивайте с `1` / `0`, как он хранит;
- пользовательский оператор, который не пишет ни один пресет: `no SQL for the operator "$within" at edited — a dialect
  preset adds it with d.node('match:$within', …)`.

Известные пробелы, описанные и покрытые тестами:
- SQL читает один уровень массива: `$has` не ищет во вложенном массиве, а путь через массив объектов
  (`{ items: { id: 1 } }` на `items: [{ id: 1 }]`) не достигается;
- числовой сегмент пути — ключ, а не индекс;
- столбец не отличает `null` от отсутствия: `$exists` значит «не NULL», а `undefined` — NULL;
- SQLite упорядочивает текст по байтам UTF-8, JS — по кодовым единицам UTF-16. Они совпадают везде, кроме сравнения
  символов выше U+FFFF с символами от U+E000 до U+FFFF.

## Диалекты как пресеты

```ts
const postgres = sqlDialect({ name: 'postgres', setup(d) {
  d.primitive('param', (index) => `$${index + 1}`);
  d.node('json-get', (n, c) => `${c.compile(n.of)}->>${c.literal(n.path[0])}`);
} });
```

База пишет формы, общие для SQLite и PostgreSQL: `LIMIT`, `ON CONFLICT`, `RETURNING`, кавычки `"`.

- **Виды узлов.** Каждый вид — цепочка. Более поздний пресет спрашивается первым, а `c.base(node?)` доходит до
  обработчика, который он заменил. Так `sqlite` пишет `LIMIT -1` перед `OFFSET` без лимита.
- **Примитивы.** `param`, `ident`, `literal` и `value` — тоже цепочки.
- **Порядок.** Пресеты упорядочивает `orderPresets`: `sqliteFts5` требует `sqlite`.
- **Внутри обработчика** `c` даёт `compile`, `param`, `named`, `ident`, `literal`, `list` и `base`.
- **Ошибки** сообщаются один раз — там, где случились:
  - неизвестный вид — с «did you mean»;
  - исключение обработчика названо по узлу и пресету: `[fundamentool/sql] node "json-get": the handler of postgres
    threw: …`.

## Адаптер

- **По одной.** Соединение выполняет операции в порядке вызова. Пока идёт транзакция, запросы другого кода ждут её
  `COMMIT` и никогда не попадают внутрь неё:

  ```ts
  const refresh = db.transaction(async (tx) => { await tx.prepare(forgetFile).run({ file }); await parseAgain(file); … });
  const found = db.prepare(find).all({ query });  // ждёт: выполнится после COMMIT refresh и увидит новые строки
  ```
- **Транзакции.** Адаптер пишет их сам для обоих драйверов (`BEGIN [IMMEDIATE]`, `SAVEPOINT` для вложенных), поэтому
  они ведут себя одинаково. Функция может быть синхронной или асинхронной; она получает сессию транзакции `tx` и
  выполняет запросы через неё — `tx.prepare(statement)` берёт запрос, подготовленный на `db`, ничего не компилируя и не
  готовя заново. `COMMIT` ждёт того, что функция оставила выполняться на `tx`; отказ или неудачный `COMMIT` откатывает
  и пробрасывается. `tx` после завершения функции — ошибка: *"this transaction is over"*.
- **`db` внутри функции — ошибка** (fundamentool D-094). Запрос на `db` там ждал бы транзакцию, а транзакция — функцию:
  она не завершилась бы никогда. Поэтому он сразу отклоняется, и сообщение называет исправление:

  ```ts
  await db.transaction(async (tx) => {
    await tx.prepare(forgetFile).run({ file });   // tx — внутри транзакции
    return db.prepare(ofFile).all({ file });      // отказ: "… run it on the transaction's own session: tx.prepare(…)"
  });                                             // и транзакция откатывается, как при любой ошибке в ней
  ```

  То же для `db.transaction`, `db.exec` и остальных, и для внешнего `tx` внутри вложенной транзакции. Запросы другого
  кода по-прежнему ждут, как выше: адаптер отличает их по `AsyncLocalStorage` из Node (цепочке вызовов, в которой
  запущена функция). Когда функция завершилась, то, что она оставила после себя (таймер), может работать с `db`. Где
  `AsyncLocalStorage` недоступен (Node до 22.3, браузер), проверка выключена, и такой вызов ждёт вечно.
  Тесты такого кода запускаются в Node, где проверка включена, так что тест, который выполняет этот вызов, находит
  ошибку.
- **`iterate`** ждёт своей очереди, чтобы начать, а затем отдаёт строки, не занимая соединение: better-sqlite3 не даёт
  выполнить на нём другой запрос, пока цикл не закончится (*"busy executing a query"*); `node:sqlite` выполняет.
- **Миграции.** Версии — целые числа от 1, по возрастанию. Каждая `up(m)` выполняется в своей транзакции (`m` — её
  сессия; `up` может быть асинхронной), а `PRAGMA
  user_version` хранит последнюю. Сбой откатывает эту версию и пробрасывается с её номером. База новее списка —
  ошибка.
- **`pragma(name, value?)`** читает прагму или устанавливает её и читает обратно. Имя — слово, значение — число,
  булево или слово, потому что прагма не принимает параметр.
- **Различия драйверов**, которые нельзя исправить на уровне запроса:
  - `bigint` больше 2⁵³ better-sqlite3 без `safeIntegers` округляет, а `node:sqlite` отклоняет;
  - у строк `node:sqlite` прототип `null`.

## Чего здесь нет

- Адаптера для драйвера, который ждёт (`pg`, Worker): порт к нему готов; потребителя пока нет.
- Отображения строк в сущности: это слой выше модуля.
- DDL как дерева: схема — текст SQL через `exec`, а её изменения — миграции.

Карточка проектирования: `LABARATORY/PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/SPEC/sql.md`.
