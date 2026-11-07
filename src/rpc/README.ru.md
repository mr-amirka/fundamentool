# rpc

> [English version](README.md)

Типобезопасный двунаправленный RPC поверх любого канала сообщений (Worker, WebSocket, iframe и т.д.).

## Когда нужен

- Один процесс, поток или машина вызывает функции другого и ждёт результат: воркер, фоновый процесс, сервер,
  веб-страница и её бэкенд.
- Протокол запросов и ответов между двумя процессами — поверх Unix- или TCP-сокета, пайпа, stdio дочернего процесса
  или WebSocket: запросы, ответы, id, ошибки. Не пиши свой, он здесь.
- Callback, переданный удалённой функции (прогресс, поток шагов), удалённая сторона шлёт данные своим клиентам, отмена
  удалённого вызова (таймаут, `AbortSignal`).
- Ошибки, которые сохраняют свой класс через канал (`instanceof TypeError` на стороне вызывающего).
- Вызовы, которые переживают обрыв соединения: браузерный или Node-клиент сервера по WebSocket, переподключение к
  следующему из нескольких адресов.
- Распределение вызовов по пулу воркеров.

| Точка входа | Содержимое |
|-------------|------------|
| `fundamentool/rpc` | Универсальное ядро: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder`; поверх WebSocket: `RpcClientWebSocket`, `serveRpcWebSocket` |
| `fundamentool/rpc/browser` | Browser-воркеры: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js: воркеры (`NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool`) и `rpcStreamTransport` поверх потока |

---

## Основные концепции

**`RpcConnect`** — серверная сторона. Принимает вызовы клиента, выполняет экспортированные методы, отправляет результаты обратно.

**`RpcClient`** — клиентская сторона. Отправляет типизированные вызовы методов через канал, возвращает Promise.
`settled()` разрешается, когда на другой стороне ничего не ждёт: вызов, от которого здесь отказались (его таймаут, его
сигнал), считается, пока другая сторона на него не ответит — там он идёт дальше (fundamentool D-109); этого ждут перед
тем, как завершить воркер: завершённый посреди нативного вызова, он может уронить свой процесс.

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
await worker.settled(); // ответ на каждый вызов, и на брошенный тоже
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

## Поверх Node-потока — сокет, stdio дочернего процесса

`rpcStreamTransport(stream, { head? })` (`fundamentool/rpc/node`) — транспорт поверх любого Node `Duplex`: одно
JSON-сообщение на строку. Строка, которая не JSON, — предупреждение, и она пропускается. `head` — то, что уже прочитано
из потока до передачи, например остаток рукопожатия; его строки читаются первыми. Поток остаётся вашим: когда он
закрылся, уничтожьте клиент или соединение. `client.destroy(reason)` отклоняет все ещё ждущие вызовы с `reason`
(fundamentool D-103).

```ts
import * as net from 'node:net';
import { RpcClient, RpcConnect } from 'fundamentool/rpc';
import { rpcStreamTransport } from 'fundamentool/rpc/node';

// сервер: по RpcConnect на соединение
net.createServer((socket) => {
  const connect = new RpcConnect({
    exports: { count: async (to: number, onStep: (step: number) => void) => { for (let i = 1; i <= to; i++) onStep(i); return to; } },
    ...rpcStreamTransport(socket),
  });
  socket.on('close', () => connect.destroy());
}).listen('/tmp/app.sock');

// клиент
const socket = net.connect('/tmp/app.sock');
const client = new RpcClient(rpcStreamTransport(socket));
socket.on('close', () => client.destroy(new Error('сервер ушёл — вызовите снова')));
await client.call('count', [3, (step: number) => console.log(step)]); // печатает 1, 2, 3; даёт 3
```

## Поверх WebSocket — браузерный или Node-клиент сервера

`RpcClientWebSocket` (клиент, в браузере и в Node 22+; в старом Node передай `WebSocket` из `ws`) и
`serveRpcWebSocket` (хост, поверх WebSocket-сервера, который передаёшь ты, — `WebSocketServer` из `ws`) — fundamentool
D-104, перенесено из `mn-utils`. Вызовы живут в сессии, которая переживает свой сокет: оборвавшийся сокет открывается
снова сразу (следующий из `url` по очереди; не ответивший пробуется снова через `reconnectMs`, 5 с), и всё, что любая
сторона отправила за это время — или отправила, а другая не получила, — отправляется снова; вызов это время ждёт. Хост
потерял сессию (перезапустился, или сокета не было `sessionMs`, сутки) — ждущие вызовы отклоняются с «вызови снова»,
а `proxy()` запрашивает экспорты заново. `client.destroy()` закрывает сокет, и хост сразу забывает сессию.

`proxy()` сам закрывает клиента, когда не удался окончательно — истёк `timeout`, сервер ответил ошибкой — или сервер не
предлагает ничего для вызова: не остаётся сокета, который некому остановить, поэтому строка
`const { log } = await new RpcClientWebSocket({ url, timeout: 5000 }).proxy();` безопасна.
Сессия, потерянная во время рукопожатия, — не неудача: он спрашивает снова на следующем сокете. `call()` клиента не
закрывает никогда. `timeout` клиента покрывает каждый вызов и рукопожатие `proxy()` — но не функции прокси после него.

```ts
// сервер
import { WebSocketServer } from 'ws';
import { serveRpcWebSocket } from 'fundamentool/rpc';

serveRpcWebSocket({
  server: new WebSocketServer({ port: 8081 }),
  exports: {
    log: (...args: unknown[]) => {
      console.log(...args);
      return 'Доставлено!';
    },
    info: async (text: string, callback: (text: string) => void) => {
      console.info(text);
      await callback('на сервере!');
      throw new Error('ошибка!');
    },
  },
});

// клиент — пример из mn-utils
import { RpcClientWebSocket } from 'fundamentool/rpc';

const client = new RpcClientWebSocket({ url: ['ws://localhost:8081'] });
const { log, info } = await client.proxy();

log('Vasya!').then((response) => console.log({ vasyaResponse: response })); // { vasyaResponse: 'Доставлено!' }
info('Пупкин!', (text: string) => console.log('Выполнил колбэк с: ', text)) // Выполнил колбэк с:  на сервере!
  .then((response) => console.log({ pupkinResponse: response }), (error) => console.error(error)); // Error: info: ошибка!
log('уже второй!');
client.destroy(); // когда закончил: `terminate` из mn-utils
```

## Ошибки через канал

Метод, который бросил, отклоняет вызов клиента ошибкой с именем исходной — стандартный класс (`TypeError`,
`RangeError`, …) возвращается этим классом, так что `instanceof TypeError` верно, — и сообщением
`"метод: её сообщение"`; её `code` тоже передаётся.

```ts
// сервер: validate: (n) => { throw new TypeError('expects a number'); }
const error = await client.call('validate', ['x']).catch((e) => e);
error instanceof TypeError; // true
error.message;              // 'validate: expects a number'
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

## Контекст вызова — `useCall()`

Долгий метод видит свой вызов через `useCall()`, вызванный **в начале** — до первого `await` (fundamentool D-055).
`this` остаётся собственным объектом метода.

```ts
import { RpcConnect, useCall } from 'fundamentool/rpc';

const connect = new RpcConnect({
  exports: {
    async exportReport(month: string) {
      const call = useCall();                   // в начале: этот вызов
      for (let page = 1; page <= 30; page++) {
        await call.interrupt(1000);             // секунда на страницу — сразу отказ, если клиент отменил
        call.dispatch({ progress: page / 30 }); // вызвавшему клиенту
      }
      return `report-${month}.pdf`;
    },
    counter: {
      count: 0,
      inc() { return ++this.count; },           // `this` — свой объект: 1, 2, 3 …
    },
  },
  ...transport,
});
```

| Член | Зачем |
|------|-------|
| `signal` | отменяется, когда клиент отказался (его `AbortController`, его таймаут) |
| `interrupt(ms, value?)` | ждёт `ms` и отдаёт `value` — при отмене сразу отказ |
| `dispatch(data)` | шлёт этому клиенту что-то до результата |
| `dispatchToAll(data)` | шлёт всем подключённым клиентам |
| `getConnections()` | соединения пула |

Вызванный после `await` или вне экспортированного метода, `useCall()` сразу бросает ошибку: к этому моменту может
выполняться другой вызов, и JavaScript не может сказать, какой из них этот. Сохранённый в переменную, контекст остаётся
верным после любого `await`.

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
