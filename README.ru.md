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
| `fundamentool/join` | Утилиты склейки строк |
| `fundamentool/split` | Утилиты разбиения строк |
| `fundamentool/jsonl` | Сериализация JSON Lines |
| `fundamentool/browser` | Browser-утилиты (WebSocket, хранилище, роутинг, DI-провайдеры) |
| `fundamentool/node` | Node.js-утилиты (файловый ввод-вывод, хеш, обход директорий) |
| `fundamentool/rpc` | RPC-ядро: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder` |
| `fundamentool/rpc/browser` | Browser-воркеры: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js-воркеры: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool` |

## Лицензия

MIT

## Основные модули

- **URL**: `urlParse`, `urlExtend`, `unparam`, `param` — разбор и расширение URL, query-строки
- **Время**: `formatTime`, `normalizeDate`, `getData` — форматирование и нормализация дат
- **События**: `attachEvent`, `EventEmitter`, `subscribe`, `Unsubscriber`
- **Асинхронность**: `wait`, `createTimeout`, `createInterval`, `createAnimationFrame`
- **Объекты и массивы**: `merge`, `without`, `extend`-подобная логика, `get` по пути
- **Строки**: `half`, `halfLast` — разбиение по разделителю
- **Прочее**: `noop`, `getUniqId`, `tryJsonParse`, провайдеры (queue, template, router и др.)

Точный список экспортов — в `src/index.ts`. Подробное API — в сгенерированной документации (`npm run docs:api`).


## Публичное API (экспортируется из `src/index.ts`)

### Утилиты для DOM и событий

- **attachEvent** (`attachEvent.ts`): безопасная подписка на DOM-событие с возвратом функции отписки.
- **EventEmitter** (`EventEmitter/`): типизированный emitter с методами `subscribe`, `once`, `clear`, `destroy`.
- **subscribe** (`subscribe.ts`): утилита для добавления/удаления слушателей в произвольную коллекцию.
- **Unsubscriber** (`Unsubscriber/`): агрегатор отписок (`add`, `unsubscribe`), удобен для сборки всех unsubscribe‑функций.
- **noop** (`noop.ts`): пустая функция, часто используется как дефолтный колбэк.

### Таймеры и асинхронность

- **wait** (`wait.ts`): `Promise`, который резолвится через указанный timeout, с опциональным значением.
- **createTimeout** (`createTimeout.ts`): обёртка над `setTimeout`, возвращает функцию отмены.
- **createInterval** (`createInterval.ts`): реализация интервала на базе `setTimeout` с контролем жизненного цикла и отменой.
- **createAnimationFrame** (`createAnimationFrame.ts`): loop на `requestAnimationFrame` с учётом накопленного времени.
- **queueProvider** (`queueProvider.ts`): последовательная очередь выполнения асинхронных задач (одна задача за раз).
- **sendingQueue** (`sendingQueue.ts`): очередь промисов с аккумуляцией ошибок и методом `drain()` для ожидания завершения всех.

### URL, роутинг и HTTP‑окружение

- **urlParse** (`urlParse.ts`): низкоуровневый разбор URL в богатую структуру (`TUrlProps`), включая `query`, `hash`, `child`.
- **urlExtend** (`urlExtend.ts`): комбинирование base URL и частичных структур URL (`TUrlOptions`), для модификации query/path.
- **unparam** (`unparam.ts`): разбор query‑строки в объект (в т.ч. вложенные структуры и массивы по скобочной нотации).
- **routeParseProvider** (`routeParseProvider.ts`): генератор regexp+маппера по route‑шаблону (используется в `routerProvider`).
- **regexpMapperProvider** (`regexpMapperProvider.ts`): привязка regexp `exec` к мапперу значений (в том числе для роутинга).
- **routerProvider** (`routerProvider.ts`): сложный роутер поверх `history`/`store` и React‑компонентов (`Link`, `Router` и т.п.).
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
