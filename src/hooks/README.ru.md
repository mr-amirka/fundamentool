# hooks — именованные моменты для пресетов

[English version](./README.md)

`fundamentool/hooks` (fundamentool D-087, lab D-042): части точки расширения (lab D-044). Хост называет моменты, в
которые могут действовать пресеты: перед записью, после неё, когда нужно разрешить шаг, когда пишется узел SQL. Пресеты
добавляют к этим моментам обработчики. Ядро знает только механизм. Всё предметное — в пресетах, и собственная
настройка проекта — тоже пресет.

```ts
import { waterfallHook, eachHook, bailHook, namedHooks, orderPresets, presetSetup, type TPreset } from 'fundamentool/hooks';

const hooks = {
  normalize: waterfallHook<string>({ name: '[sql] normalize' }),
  afterParse: eachHook<TTree>({ name: '[documents] afterParse' }),
  quote: bailHook<string, string>({ name: '[sql] quote' }),
};

const off = hooks.normalize.add((text) => text.trim(), { by: 'presetTrim' });
const text = hooks.normalize.run(' SELECT 1 '); // 'SELECT 1': результат каждого обработчика идёт следующему
hooks.afterParse.run(tree);                     // сказано каждому обработчику
off();                                          // удалён; второй вызов ничего не делает
```

Эти хуки синхронные: `run` возвращает само значение, а обработчик возвращает своё. **Обработчикам, которые могут
ждать**, — хранилище, сеть, файл — нужен [`fundamentool/async/hooks`](../async/hooks/README.ru.md): те же виды под теми
же именами, `run` возвращает промис, и ещё `parallelHook` (§ «Синхронные здесь, асинхронные там»).

| Член | Что это |
|------|---------|
| `eachHook<T>()` | Сказано каждому обработчику; никто не отвечает |
| `waterfallHook<T>()` | Каждый обработчик получает результат предыдущего и может его изменить; `undefined` оставляет как есть |
| `bailHook<T, R>()` | Ответ — первый обработчик, который ответил (не `undefined`) |
| `chainHook<T, R>()` | Middleware: обработчик вызывает `next`, чтобы дойти до остальных, или отвечает сам |
| `hookMap(create)` | Хуки по ключу, создаются при первом обращении: обработчик на каждый вид узла SQL |
| `namedHooks(hooks, where)` | Хуки хоста по имени для его пресетов; на неизвестное имя — «did you mean» |
| `orderPresets(presets, options?)` | Пресеты в порядке настройки: каждый после тех, что он `requires` |
| `presetSetup(preset)` | Настройка пресета, будь он функцией или `{ name, setup }` |
| `hookError(name, by, error)` | Ошибка, которой становится исключение обработчика |

У каждого хука есть `add(handler, { order?, by? })`, который возвращает своё удаление, а также `run` и `size`. `size` —
число обработчиков: хост, у хука которого их нет, может пропустить работу, которую делал бы для них.

## Какой вид

| Момент | Вид | Пример |
|--------|-----|--------|
| остальные должны узнать, что это случилось | `each` | `afterWrite(change)` |
| остальные могут изменить значение до того, как его используют | `waterfall` | `beforeWrite(change)` добавляет отметку |
| кто-то из остальных знает ответ | `bail` | `resolve(step)`: пресет, который знает вид шага |
| обработчик должен действовать до и после остальных или заменить один, но всё равно до него дойти | `chain` | диалект SQL поверх формы ANSI |

Для каждого — один способ (lab D-016). Значение, которое меняют по очереди, — это `waterfall`, а не `chain`, где все
обработчики вызывают `next(changed)`. Первый ответ — это `bail`, а не `chain`, где обработчики возвращают без `next`.
Обработчик `chain`, забывший `next`, молча останавливает остальных, поэтому другие виды `next` не требуют вовсе.

## Порядок

Правило одно: **последнее слово за более поздним обработчиком.**

| Вид | Кто первый | Значит, более поздний пресет… |
|-----|-----------|------------------------------|
| `each`, `waterfall` | добавленный раньше всех | …выполняется после и в waterfall видит и может изменить то, что сделали ранние |
| `bail`, `chain` | добавленный позже всех | …спрашивается первым и отвечает вместо раннего; в chain он оборачивает ранних и доходит до них через `next` |

`order: 'pre'` ставит обработчик перед всеми остальными, `'post'` — после них. Внутри каждой группы действует правило
выше. Пусть обработчики добавлены в таком порядке: A, B (`post`), C, D (`pre`):

```
each / waterfall:  D, A, C, B
bail / chain:      D, C, A, B
```

Обработчик добавляется или удаляется заменой списка хука. Запуск читает список, с которым начал, поэтому обработчик,
который удаляет себя или добавляет другой, не меняет идущий запуск.

## Цепочки и диалекты

```ts
const nodes = hookMap((kind: string) => chainHook<TNode, string>({ name: `[fundamentool/sql] node "${kind}"` }));

nodes.for('json-get').add((n) => `json_extract(${n.of}, '$.${n.path.join('.')}')`, { by: 'sqlite' });
nodes.for('json-get').add((n, next) => (n.path.length === 1 ? `${n.of}->>'${n.path[0]}'` : next()), { by: 'postgres' });

nodes.for('json-get').run({ of: 'attrs', path: ['status'] }, fail);    // "attrs->>'status'"  — ответил postgres
nodes.for('json-get').run({ of: 'attrs', path: ['a', 'b'] }, fail);    // "json_extract(attrs, '$.a.b')" — postgres пошёл дальше
nodes.get('text-match');                                                // undefined: ни один пресет его не принёс
```

`next()` идёт дальше с тем же значением, `next(other)` — с другим. `end` отвечает, когда каждый обработчик пошёл дальше.

## Ошибки

Ошибка обработчика никогда не проглатывается (lab D-044, пункт 6). Она доходит до вызвавшего `run` с именем хука и
того, кто добавил обработчик, а исходная ошибка — в `cause`:

```
[documents] beforeWrite: the handler of presetLabRecords threw: Cannot read properties of undefined (reading 'attrs')
```

Без `by` сообщение говорит «a handler threw», без `name` начинается с `hook`. Обработчики после бросившего не
выполняются. В цепочке ошибка, вышедшая из `next` (другого обработчика, уже названная, или `end`), проходит через внешние
обработчики без изменений, поэтому называется один раз — там, где случилась.

Опции — код, поэтому проверяются только в разработке (lab D-023): неизвестный ключ с «did you mean», `order` не `pre` /
`post`, обработчик не функция. `namedHooks` проверяет имя всегда: с неизвестным всё равно нечего было бы запускать.

## Синхронные здесь, асинхронные там

Два модуля, по одному на режим (lab D-050, fundamentool D-091): хост выбирает один раз — по тому, что делают его
обработчики.

| | `fundamentool/hooks` | `fundamentool/async/hooks` |
|-|----------------------|----------------------------|
| Для чего | чистая работа на горячем пути: компилятор SQL пишет узел | обработчики, которые могут ждать: ссылка проверяется перед записью, поисковый индекс обновляется после неё |
| `run` | возвращает значение | возвращает его промис |
| Обработчик | возвращает своё значение | возвращает значение или промис — оба ожидаются одинаково |
| Виды | `eachHook`, `waterfallHook`, `bailHook`, `chainHook` | те же четыре и `parallelHook` — все обработчики сразу |
| Хост берёт | только синхронный код | только асинхронный, поверх того же ядра |

```ts
import { chainHook } from 'fundamentool/hooks';
const node = chainHook<TNode, string>({ name: '[fundamentool/sql] node "json-get"' });
node.run(n, fail);                                   // строка

import { waterfallHook } from 'fundamentool/async/hooks';
const beforeWrite = waterfallHook<TChange>({ name: '[documents] beforeWrite' });
beforeWrite.add(async (change) => (await linkExists(change.link) ? undefined : { ...change, link: undefined }));
const change = await beforeWrite.run(proposed);       // промис
```

Список обработчиков, порядок, удаление, собственный список запуска и названия ошибок — ядро этого модуля;
асинхронный модуль импортирует его, поэтому оба ведут себя одинаково. `hookMap`, `namedHooks` и `orderPresets` от
режима не зависят и принимают хуки любого из двух.

## Пресеты

```ts
type TPreset<H> = ((host: H) => void) | { name: string; requires?: readonly string[]; setup(host: H): void };

const ordered = orderPresets([presetMain, presetHints, presetStandard], { where: '[documents] documentsProvider' });
// [presetHints, presetStandard, presetMain] — presetMain требует двух других
for (const preset of ordered) {
  presetSetup(preset)(host);
}
```

Порядок устойчивый. При прочих равных пресеты сохраняют порядок списка. Зависимость поднимается ровно настолько,
насколько нужно, а пресет-функция остаётся на своём месте. `connected` — пресеты прошлых вызовов: они засчитываются в
`requires`, а тот же объект второй раз не возвращается.

Каждая ошибка находится до того, как выполнится любой `setup`:

| Ошибка | Сообщение (после `where`) |
|--------|---------------------------|
| не список | `expects a list of presets, got object` |
| не пресет | `expects a preset — a function or { name, setup } — got null` |
| нет имени, нет `setup` | `preset object: a preset object needs a "name"` · `preset "a": a preset object needs a "setup(host)" function` |
| `requires` не подключён | `presetLabRecords requires "presetFieldLines", which is not connected. Connected presets: …` |
| цикл | `presets require each other: presetA → presetB → presetA` |
| два объекта, одно имя | `two different presets are named "x"` |

`orderPresets` проверяет только `name`, `requires` и `setup`. Свои поля хост проверяет своей схемой (minotation
проверяет `notationMode` и `ecosystems`), поэтому в ядре нет ничего предметного.

## Не покрыто

- **Параллельный bail** (`AsyncParallelBailHook` у Tapable): хосту он пока не нужен; это был бы отдельный вид в
  `fundamentool/async/hooks`, как `parallelHook`.
- **Числовые приоритеты** (`stage` у Tapable, `before: 'name'`): вызывающим хватает `order` и `requires` пресета.
- **Перехват каждого вызова** (`intercept` у Tapable): это делает обработчик `pre`.
