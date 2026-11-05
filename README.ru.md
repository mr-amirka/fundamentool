# fundamentool

> [English version](README.md)

Набор утилит для работы с данными, URL, временем, событиями и асинхронным кодом.

## Установка

```bash
npm install fundamentool
```

## Сборка

```bash
npm run build
```

Типы и сборка попадают в `dist/`.

## Тесты

```bash
npm test
```

## Документация API

Генерация Typedoc в каталог `docs/`:

```bash
npm run docs:api
```

## Точки входа

| Точка входа | Содержимое |
|-------------|------------|
| `fundamentool` | Универсальные утилиты (строки, объекты, массивы, типовые проверки и т.д.) |
| `fundamentool/async` | Асинхронные итераторы, параллельное выполнение, последовательность |
| `fundamentool/is` | Предикаты типов (`isString`, `isEqual`, `isMatch` и др.) |
| `fundamentool/schema` | Схемы опций с именами zod: `object`, `array`, `string`, … — проверка, тип и список ключей из одного описания ([README](src/schema/README.ru.md)) |
| `fundamentool/css` | Значения CSS из короткой записи в нотации вызывающего: математика с единицами (`100%-2*$gap` → `calc(100% - 2 * var(--gap))`), переменные, цвета, градиенты; `cssMediaCondition`, `childCombinator` ([README](src/css/README.ru.md)) |
| `fundamentool/source` | Строки из исходного кода без его запуска: комментарии заменяются пробелами с сохранением длины, строки, которыми может стать выражение (`on ? 'a' : 'b'` → `a`, `b`), строки в местах по имени (атрибуты, переменные, вызовы) — текстом или парсером TypeScript, переданным аргументом; `sfcParts`, `applyEdits` ([README](src/source/README.ru.md)) |
| `fundamentool/match` | Фильтр как данные: шаблон, скомпилированный один раз в предикат (`matchProvider`), тот же шаблон деревом для SQL (`normalizeMatch`), операторы, которые проект расширяет (`STANDARD_OPERATORS`) ([README](src/match/README.ru.md)) |
| `fundamentool/vectors` | Математика над эмбеддингами: `nearest` (ближайшие векторы, с отбором до подсчёта), `fuseRanks` (слияние рейтингов по местам), `toBytes` / `fromBytes`, `chunkText` (целые предложения кусками, которые модель читает целиком) ([README](src/vectors/README.ru.md)) |
| `fundamentool/hooks` | Именованные моменты, в которые хост даёт действовать пресетам: четыре вида синхронных хуков (`eachHook`, `waterfallHook`, `bailHook`, `chainHook`), хуки по ключу (`hookMap`), хуки хоста по имени (`namedHooks`), порядок пресетов по их зависимостям (`orderPresets`) ([README](src/hooks/README.ru.md)) |
| `fundamentool/async/hooks` | Те же виды под теми же именами для обработчиков, которые могут ждать, — обработчик возвращает значение или промис одинаково, `run` возвращает промис — и `parallelHook`, все обработчики сразу ([README](src/async/hooks/README.ru.md)) |
| `fundamentool/sql` | Запрос как данные: построители простых узлов, `matchWhere` (шаблон `match` как условие с теми же строками), компилятор, у которого виды узлов — цепочки `fundamentool/hooks`, так что диалект — пресет (`sqlite`, `sqliteFts5`), и `sqliteAdapter` — одна асинхронная форма поверх better-sqlite3 и `node:sqlite` с транзакциями и миграциями ([README](src/sql/README.ru.md)) |
| `fundamentool/i18n` | Локализация: одна локаль на приложение, свой набор сообщений у каждого пакета, чтение по константам ключей — `t(K.hud.moves, { count })`; множественное число и форматы в сообщении; Vite-плагин `fundamentool/i18n/vite` (компактная сборка, локали в бандле или по запросу), `fundamentool/i18n/testing` (`checkSet`) ([README](src/i18n/README.ru.md)) |
| `fundamentool/vdom` | ⚠️ Проба (D-072): своя библиотека отображения с API React — элементы, функциональные компоненты, хуки, контексты, порталы, `createRoot` — 5,6 КБ gzip; MUI и emotion работают на ней через алиасы сборщика на `fundamentool/vdom/react` (D-073); `act` для тестов ([README](src/vdom/README.ru.md)) |
| `fundamentool/join` | Утилиты склейки строк |
| `fundamentool/split` | Утилиты разбиения строк |
| `fundamentool/jsonl` | Сериализация JSON Lines |
| `fundamentool/browser` | Browser-утилиты (WebSocket, хранилище, роутинг, DI-провайдеры) |
| `fundamentool/node` | Node.js-утилиты (файловый ввод-вывод, хеш, обход директорий) |
| `fundamentool/rpc` | RPC-ядро: `RpcClient`, `RpcConnect` (метод видит свой вызов через `useCall()`), `RpcClientPool`, `RpcCoder` |
| `fundamentool/rpc/browser` | Browser-воркеры: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js-воркеры: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool` |

## Лицензия

MIT

## Основные модули

- **Модули**: `dynamicModule` — асинхронная инициализация, выполняемая один раз (повторно — после неудачи); `import()` части, загружаемой по требованию
- **URL**: `urlParse`, `urlExtend`, `unparam`, `param` — разбор и расширение URL, query-строки
- **Время**: `formatTime`, `normalizeDate`, `getData` — форматирование и нормализация дат
- **События**: `attachEvent`, `EventEmitter`, `subscribe`, `Unsubscriber`, `keyedRegistry`
- **Асинхронность**: `wait`, `createTimeout`, `createInterval`
- **Объекты и массивы**: `merge`, `without`, `extend`-подобная логика, `get` по пути
- **Строки**: `half`, `halfLast` — разбиение по разделителю; `pairsProvider` / `pairsSchema` — опция-список (`'a, b:c'`, `['a', 'b:c']` или `{ b: 'c' }`) в пары
  `[имя, значение]` и её проверка
- **Прочее**: `noop`, `getUniqId`, `tryJsonParse`, провайдеры (queue, template, router и др.)

Точный список экспортов — в `src/index.ts`. Подробное API — в сгенерированной документации (`npm run docs:api`).


## Публичное API (экспортируется из `src/index.ts`)

### Утилиты для DOM и событий

- **attachEvent** (`attachEvent.ts`): безопасная подписка на DOM-событие с возвратом функции отписки.
- **EventEmitter** (`EventEmitter/`): типизированный emitter с методами `subscribe`, `once`, `clear`, `destroy`.
- **keyedRegistry** (`keyedRegistry.ts`): наборы элементов по ключу (подписки на уровень, юнит, канал чата): `add` возвращает своё удаление, `list`, `has`, `forget` — убрать ключ целиком.
- **subscribe** (`subscribe.ts`): утилита для добавления/удаления слушателей в произвольную коллекцию.
- **Unsubscriber** (`Unsubscriber/`): агрегатор отписок (`add`, `unsubscribe`), удобен для сборки всех unsubscribe‑функций.
- **noop** (`noop.ts`): пустая функция, часто используется как дефолтный колбэк.

### Таймеры и асинхронность

- **wait** (`wait.ts`): `Promise`, который резолвится через указанный timeout, с опциональным значением.
- **createTimeout** (`createTimeout.ts`): обёртка над `setTimeout`, возвращает функцию отмены.
- **createInterval** (`createInterval.ts`): реализация интервала на базе `setTimeout` с контролем жизненного цикла и отменой.
- **queueProvider** (`queueProvider.ts`): последовательная очередь выполнения асинхронных задач (одна задача за раз).
- **withAsyncLock** (`withAsyncLock.ts`): асинхронная функция, вызовы которой игнорируются, пока идёт предыдущий (и `minMs` от его начала) — защита от двойного нажатия.
- **sendingQueue** (`sendingQueue.ts`): очередь промисов с аккумуляцией ошибок и методом `drain()` для ожидания завершения всех.

### URL, роутинг и HTTP‑окружение

- **urlParse** (`urlParse.ts`): низкоуровневый разбор URL в богатую структуру (`TUrlProps`), включая `query`, `hash`, `child`.
- **urlExtend** (`urlExtend.ts`): объект поверх base URL (`TUrlOptions`: поля поверх, query сливаются); строка читается
  относительно base, как `<a href>` (`'/a?y=2'` + `'?x=1'` → `'/a?x=1'`, D-056).
- **unparam** (`unparam.ts`): разбор query‑строки в объект (в т.ч. вложенные структуры и массивы по скобочной нотации).
- **routeParseProvider** (`routeParseProvider.ts`): генератор regexp+маппера по route‑шаблону (используется в таблице маршрутов роутера).
- **regexpMapperProvider** (`regexpMapperProvider.ts`): привязка regexp `exec` к мапперу значений (в том числе для роутинга).
- **Роутер** (`router/`): примитивы истории, роутер на каждую часть адреса, навигатор страниц и окон — см. [src/router/README.ru.md](src/router/README.ru.md).
- **rpc** (`rpc/`): семейство модулей для RPC‑взаимодействия (кодирование сообщений, клиент, пул клиентов, browser/node адаптеры).

### Шаблоны и текст

- **templateProvider** (`templateProvider.ts`): mini‑template движок `{{expr}}` по объекту‑scope (с `templatePartsJoin` под капотом).
- **convertToBreakLineHTML** (`convertToBreakLineHTML.ts`): преобразование текста с `\n` в HTML со span/br и экранированием `<`/`>`.
- **formatTime** (`formatTime.ts`): форматирование дат по маске, плюс вспомогательные `normalizeDate`, `getData`.
- **dateToUTCString** (`dateToUTCString.ts`): компактный UTC‑строковый формат `YYYYMMDDThhmmssZ`.
- **withoutEmpty** (`withoutEmpty.ts`): очистка структуры от `null` / `undefined` / пустых строк (с контролем глубины).

### Объекты и коллекции

- **merge** (`merge.ts`): семантический merge коллекции значений.
- **mapperProvider** (`mapperProvider.ts`): маппер `[values] -> {keys: values[i]}` с опциональным dst.
- **pushArray** (`pushArray.ts`): эффективная конкатенация array‑like в массив.
- **without** (`without.ts`): копия объекта без указанных ключей.

### Базовые утилиты

- **half** (`half.ts`): разбиение строки на две части по разделителю.
- **tryJsonParse** (`tryJsonParse.ts`): безопасный `JSON.parse` с возвратом исходного значения при ошибке.
- **getUniqId** (`getUniqId.ts`): генерация уникального строкового ID с опциональным префиксом.

### Стор

- **createStore** / **createApi** (`Store/`): минималистичный реактивный стор. Типы (`Store<T>`, `StoreWritable<T>`, `TStoreAdapter`) вынесены в `Store/types.ts` и отдельно импортируемы.
- **TStoreAdapter**: тип-адаптер для пары фабрик — позволяет подставить любую совместимую реализацию (effector и т.п.).

### Хранилища и cookie

- **localStorageProvider** (`localStorageProvider.ts`): реактивный адаптер под localStorage. Второй параметр `deps: Partial<TStoreAdapter>` — опциональная замена стора.
- **cookieStorageProvider** (`cookieStorageProvider.ts`): реактивный адаптер под cookie‑хранилище. Аналогичный `deps`-параметр.

#### DI в сторе

Все провайдеры, работающие через стор, принимают необязательный параметр `deps`:

```ts
import { localStorageProvider, TStoreAdapter } from 'fundamentool';

// по умолчанию — встроенный стор
const ls = localStorageProvider(window);

// кастомный адаптер — например, effector-обёртка
const myAdapter: TStoreAdapter = { createStore: effector.createStore, createApi: myEffectorApi };
const ls2 = localStorageProvider(window, myAdapter);
```
