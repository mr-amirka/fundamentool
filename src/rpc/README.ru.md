# rpc

> [English version](README.md)

Типобезопасный двунаправленный RPC поверх любого канала сообщений (Worker, WebSocket, iframe и т.д.).

| Точка входа | Содержимое |
|-------------|------------|
| `fundamentool/rpc` | Универсальное ядро: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder` |
| `fundamentool/rpc/browser` | Browser-воркеры: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js-воркеры: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool` |

---

## Основные концепции

**`RpcConnect`** — серверная сторона. Принимает вызовы клиента, выполняет экспортированные методы, отправляет результаты обратно.

**`RpcClient`** — клиентская сторона. Отправляет типизированные вызовы методов через канал, возвращает Promise.

**`RpcClientPool`** — распределяет вызовы по пулу экземпляров `RpcClient` (например, нескольким воркерам), направляя каждый вызов наименее загруженному.

Обе стороны взаимодействуют через транспортный интерфейс: `{ postMessage, onMessage }`. Подходит любой канал передачи сообщений.

---

## Быстрый старт — в одном потоке (для тестов)

```ts
import { RpcClient, RpcConnect } from 'fundamentool/rpc';

let serverHandler: ((data: any) => void) | undefined;

const connect = new RpcConnect({
  exports: {
    add: (a: number, b: number) => a + b,
  },
  postMessage: (data) => client.handleMessage(data),
  onMessage: (cb) => { serverHandler = cb; return () => {}; },
});

const client = new RpcClient({
  postMessage: (data) => serverHandler?.(data),
  onMessage: (cb) => connect.handleMessage.bind(connect),
});

const result = await client.call('add', [3, 4]); // 7
```

---

## Node.js воркеры

```ts
// worker.ts
import { NodeRpcConnectWorker } from 'fundamentool/rpc/node';

NodeRpcConnectWorker.run({
  greet: (name: string) => `hello ${name}`,
});
```

```ts
// main.ts
import { NodeRpcClientWorker } from 'fundamentool/rpc/node';

const worker = new NodeRpcClientWorker('./worker.js');
const msg = await worker.call('greet', ['world']); // 'hello world'
worker.destroy();
```

### Пул воркеров

```ts
import { NodeRpcClientWorkerPool } from 'fundamentool/rpc/node';

const pool = new NodeRpcClientWorkerPool('./worker.js', { maxWorkers: 4 });
const results = await Promise.all([
  pool.call('greet', ['Alice']),
  pool.call('greet', ['Bob']),
]);
pool.destroy();
```

---

## Browser-воркеры

```ts
// worker.ts
import { RpcConnectWorker } from 'fundamentool/rpc/browser';
RpcConnectWorker.run({ compute: (n: number) => n * 2 });
```

```ts
// main.ts
import { RpcClientWorker } from 'fundamentool/rpc/browser';

const worker = new RpcClientWorker(new Worker('./worker.js'));
const result = await worker.call('compute', [21]); // 42
worker.destroy();
```

---

## Подписки и callback-аргументы

`RpcClient` поддерживает передачу функций как аргументов — они сериализуются как межпоточные колбэки:

```ts
await client.call('run', [(progress: number) => {
  console.log('progress:', progress);
}]);
```

Серверная сторона также может отправлять события:

```ts
// подписка на клиенте
await client.subscribe('update', (data) => console.log(data));
```

---

## RpcCoder — низкоуровневая сериализация

`RpcCoder` сериализует произвольные данные (включая функции, Symbol и Promise) в JSON-совместимый wire-формат. `RpcClient` и `RpcConnect` используют его внутри; напрямую он нужен только при построении собственного транспортного слоя.

### Модель асимметричной пары

**Каждая сторона канала должна иметь собственный экземпляр `RpcCoder`.** Два кодера образуют пару — клиент и сервер — с чётко асимметричными ролями:

- **Клиентский кодер** кодирует данные, исходящие от клиента, и декодирует данные, пришедшие от сервера.
- **Серверный кодер** кодирует данные, исходящие от сервера, и декодирует данные, пришедшие от клиента.

Каждый кодер ведёт раздельные реестры: собственные функции ("internals") и функции, полученные с другой стороны ("externals"). **Кодер не должен декодировать то, что сам закодировал.** В противном случае он попытается сопоставить индексы внутренних функций с внешним реестром — это некорректно и приводит к непредсказуемому поведению.

```ts
import { RpcCoder } from 'fundamentool/rpc';

// Соединяем пару так, чтобы encode одного кодера шёл в decode другого.
const clientCoder = new RpcCoder((fnIndex: number) => {
  return (...args: any[]) => serverCoder.invoke(fnIndex, args);
});

const serverCoder = new RpcCoder((fnIndex: number) => {
  return (...args: any[]) => clientCoder.invoke(fnIndex, args);
});

// Клиент кодирует → сервер декодирует:
const wire = clientCoder.encode({ name: 'Alice', greet(text: string) { return text; } });
const decoded = serverCoder.decode(wire);
// decoded.greet('hello') вызывает clientCoder.invoke → выполняет оригинальную функцию на клиенте.

// Сервер кодирует → клиент декодирует (симметрично, обратное направление):
const reply = serverCoder.encode({ result: 42 });
const clientSide = clientCoder.decode(reply);
```

### Почему существует асимметрия

Когда клиент передаёт функцию как аргумент, клиентский кодер регистрирует её как internal и отправляет по wire только числовой индекс. Серверный кодер регистрирует этот индекс как external-заглушку — прокси, который при вызове маршрутизирует запрос обратно в `invoke` клиента. Если бы один кодер попытался декодировать собственный вывод, он искал бы индекс в неверном реестре и не смог бы восстановить корректный путь вызова.
