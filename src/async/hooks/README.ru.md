# async/hooks — именованные моменты, обработчики которых могут ждать

[English version](./README.md)

`fundamentool/async/hooks` (fundamentool D-091, lab D-046, D-050): хуки [`fundamentool/hooks`](../../hooks/README.ru.md)
для хоста, обработчики которого могут ждать, — ссылка проверяется по сети перед записью, поисковый индекс обновляется
после неё, разрешение шага читает хранилище. Те же четыре вида под теми же именами и `parallelHook`. Обработчик может
вернуть значение или промис: хук ожидает их одинаково.

```ts
import { waterfallHook, eachHook, parallelHook, bailHook, chainHook, namedHooks } from 'fundamentool/async/hooks';

const hooks = {
  beforeWrite: waterfallHook<TChange>({ name: '[documents] beforeWrite' }),
  afterWrite: parallelHook<TChange>({ name: '[documents] afterWrite' }),
  resolve: bailHook<TStep, TNode[]>({ name: '[documents] resolve' }),
};

hooks.beforeWrite.add(async (change) => (await linkExists(change.link) ? undefined : { ...change, link: undefined }));
hooks.beforeWrite.add((change) => (change.accepted ? undefined : { ...change, accepted: now() })); // не ждёт — тоже подходит
const change = await hooks.beforeWrite.run(proposed);
await hooks.afterWrite.run(change); // все обработчики запущены сразу; завершается, когда завершились все
```

| Член | Что это |
|------|---------|
| `eachHook<T>()` | Сказано каждому обработчику, по очереди: каждый начинает после того, как завершился предыдущий |
| `parallelHook<T>()` | Сказано каждому обработчику, всем сразу; `run` завершается, когда завершились все |
| `waterfallHook<T>()` | Каждый обработчик получает то, чем завершился предыдущий; `undefined` оставляет значение |
| `bailHook<T, R>()` | Первый ответ; следующий обработчик спрашивается только после того, как предыдущий вернул `undefined` |
| `chainHook<T, R>()` | Middleware, как у Koa и Mongoose: обработчик ждёт `next`, чтобы дойти до остальных, или отвечает сам |
| `hookMap`, `namedHooks`, `orderPresets`, `presetSetup`, `hookError` | собственные `fundamentool/hooks`, переэкспортированы: от режима не зависят |

Каждый `run` возвращает промис. Порядок (`pre`, `post`, «последнее слово за более поздним обработчиком»), удаление,
собственный список запуска и названия ошибок — ядро `fundamentool/hooks`, импортированное, а не скопированное: они
ведут себя так, как описано в его README.

## `parallelHook`

```ts
const afterWrite = parallelHook<TChange>({ name: '[documents] afterWrite' });
afterWrite.add((change) => search.update(change), { by: 'presetSearch' });
afterWrite.add((change) => mirror.push(change), { by: 'presetMirror' });
await afterWrite.run(change);
```

```
run(change) → presetSearch начинает → presetMirror начинает → оба завершаются → run завершается
```

Обработчики начинают в порядке выполнения. `run` ждёт каждого, поэтому ни один не остаётся работать без присмотра.
Один сбой — отказ с его названной ошибкой; несколько — `AggregateError` из них в порядке выполнения, ни один не
теряется:

```
[documents] afterWrite: 2 handlers threw
  [documents] afterWrite: the handler of presetSearch threw: …
  [documents] afterWrite: the handler of presetMirror threw: …
```

Это отдельный вид, а не опция `eachHook`: «по очереди» и «все сразу» — два поведения, которые хост выбирает один раз
(lab D-050), как `AsyncSeriesHook` и `AsyncParallelHook` у Tapable — два класса.

## Какой модуль

| Обработчики | Модуль |
|-------------|--------|
| чистая работа на горячем пути — компилятор SQL пишет текст узла | `fundamentool/hooks` |
| могут ждать — ввод-вывод, хранилище, сеть, Worker | `fundamentool/async/hooks` |

Компилятор SQL берёт `fundamentool/hooks`: диалекту никогда не нужен ввод-вывод, чтобы написать узел, а цепочки
работают для каждого узла каждого запроса. Хост документов берёт этот модуль. Хост не смешивает два модуля для одного
момента.

`fundamentool/async` этот модуль не переэкспортирует: его имена — имена синхронного модуля, а `fundamentool/async`
переэкспортируется корнем пакета.
