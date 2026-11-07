# rpc

> [Русская версия](README.ru.md)

Type-safe bidirectional RPC over any message channel (Worker, WebSocket, iframe, etc.).

## When you need it

- One process, thread or machine calls functions of another and awaits their results: a worker, a background process,
  a server, a web page talking to its backend.
- A request and response protocol between two processes — over a Unix or TCP socket, a pipe, a child's stdio or a
  WebSocket: requests, answers, ids, errors. Don't write one, it is here.
- A callback passed to a remote function (progress, a stream of steps), the remote side pushing data to its callers,
  cancelling a remote call (timeout, `AbortSignal`).
- Errors that keep their class across the channel (`instanceof TypeError` on the caller's side).
- Calls that survive a dropped connection: a browser or a Node client of a server over a WebSocket, reconnecting to
  the next of several addresses.
- Spreading calls over a pool of workers.

| Entry point | Contents |
|-------------|----------|
| `fundamentool/rpc` | Universal core: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder`; over a WebSocket: `RpcClientWebSocket`, `serveRpcWebSocket` |
| `fundamentool/rpc/browser` | Browser workers: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js: workers (`NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool`) and `rpcStreamTransport` over a stream |

---

## Core concepts

**`RpcConnect`** — server side. Receives calls from a client, invokes exported methods, returns results.

**`RpcClient`** — client side. Sends typed method calls over a channel, returns Promises.

**`RpcClientPool`** — distributes calls across a pool of `RpcClient` instances (e.g. multiple workers), routing each call to the least-busy worker.

Both ends communicate via a transport interface: `{ postMessage, onMessage }`. Any channel that can pass messages works.

---

## Quick start — in-process (testing / same thread)

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

## Node.js workers

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

### Worker pool

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

## Browser workers

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

## Over a Node stream — a socket, a child's stdio

`rpcStreamTransport(stream, { head? })` (`fundamentool/rpc/node`) is the transport over any Node `Duplex`: one JSON
message per line. A line that is no JSON is warned of and skipped. `head` is what was read from the stream before it
was handed over, such as a handshake's rest; its lines are read first. The stream stays yours: when it closes, destroy
the client or the connection. `client.destroy(reason)` rejects every call still waiting with `reason`
(fundamentool D-103).

```ts
import * as net from 'node:net';
import { RpcClient, RpcConnect } from 'fundamentool/rpc';
import { rpcStreamTransport } from 'fundamentool/rpc/node';

// the server: one RpcConnect per connection
net.createServer((socket) => {
  const connect = new RpcConnect({
    exports: { count: async (to: number, onStep: (step: number) => void) => { for (let i = 1; i <= to; i++) onStep(i); return to; } },
    ...rpcStreamTransport(socket),
  });
  socket.on('close', () => connect.destroy());
}).listen('/tmp/app.sock');

// the client
const socket = net.connect('/tmp/app.sock');
const client = new RpcClient(rpcStreamTransport(socket));
socket.on('close', () => client.destroy(new Error('the server went away — call again')));
await client.call('count', [3, (step: number) => console.log(step)]); // logs 1, 2, 3; resolves 3
```

## Over a WebSocket — a browser or Node client of a server

`RpcClientWebSocket` (a client, in a browser and in Node 22+; older Node passes `ws`'s `WebSocket`) and
`serveRpcWebSocket` (the host, over a WebSocket server you pass in — `ws`'s `WebSocketServer`) — fundamentool D-104,
ported from `mn-utils`. The calls live in a session that outlasts its socket: a socket that drops is opened again at
once (the next of the `url`s in turn; one that doesn't answer is tried again after `reconnectMs`, 5 s), and whatever
either end sent meanwhile — or sent and the other didn't get — is sent again; a call waits through it. A host that
lost the session (it restarted, or the socket stayed away `sessionMs`, a day) — the calls waiting reject with "call
again", and `proxy()` asks for the exports again. `client.destroy()` closes the socket and the host forgets the
session at once.

`proxy()` closes the client itself when it fails for good — the `timeout` passed, the server answered an error — or
the server offers nothing to call: no socket stays alive that no one can stop, so the one-line
`const { log } = await new RpcClientWebSocket({ url, timeout: 5000 }).proxy();` is safe. A
session lost during the handshake is no failure: it asks again on the next socket. `call()` never closes the client.
The client's `timeout` covers every call, and `proxy()`'s handshake — not the proxy's functions after it.

```ts
// the server
import { WebSocketServer } from 'ws';
import { serveRpcWebSocket } from 'fundamentool/rpc';

serveRpcWebSocket({
  server: new WebSocketServer({ port: 8081 }),
  exports: {
    log: (...args: unknown[]) => {
      console.log(...args);
      return 'Delivered!';
    },
    info: async (text: string, callback: (text: string) => void) => {
      console.info(text);
      await callback('on the server!');
      throw new Error('a mistake!');
    },
  },
});

// the client — mn-utils's example
import { RpcClientWebSocket } from 'fundamentool/rpc';

const client = new RpcClientWebSocket({ url: ['ws://localhost:8081'] });
const { log, info } = await client.proxy();

log('Vasya!').then((response) => console.log({ vasyaResponse: response })); // { vasyaResponse: 'Delivered!' }
info('Pupkin!', (text: string) => console.log('Ran the callback with:', text)) // Ran the callback with: on the server!
  .then((response) => console.log({ pupkinResponse: response }), (error) => console.error(error)); // Error: info: a mistake!
log('the second one!');
client.destroy(); // when done: mn-utils's `terminate`
```

## Errors across the channel

A method that throws rejects the client's call with an error named as the original — a standard class (`TypeError`,
`RangeError`, …) comes back as that class, so `instanceof TypeError` holds — and the message `"method: its message"`;
its `code` crosses too.

```ts
// server: validate: (n) => { throw new TypeError('expects a number'); }
const error = await client.call('validate', ['x']).catch((e) => e);
error instanceof TypeError; // true
error.message;              // 'validate: expects a number'
```

---

## Subscriptions and callbacks

`RpcClient` supports passing functions as arguments — they are serialized as cross-thread callbacks:

```ts
await client.call('run', [(progress: number) => {
  console.log('progress:', progress);
}]);
```

Server-side can also emit events:

```ts
// subscribe on client
await client.subscribe('update', (data) => console.log(data));
```

---

## The call's context — `useCall()`

A long method sees its own call through `useCall()`, called **at the top** — before its first `await` (fundamentool
D-055). `this` stays the method's own object.

```ts
import { RpcConnect, useCall } from 'fundamentool/rpc';

const connect = new RpcConnect({
  exports: {
    async exportReport(month: string) {
      const call = useCall();                   // at the top: this call
      for (let page = 1; page <= 30; page++) {
        await call.interrupt(1000);             // a second per page — rejects at once if the client gives up
        call.dispatch({ progress: page / 30 }); // to the client that called
      }
      return `report-${month}.pdf`;
    },
    counter: {
      count: 0,
      inc() { return ++this.count; },           // `this` — its own object: 1, 2, 3 …
    },
  },
  ...transport,
});
```

| Member | What for |
|--------|----------|
| `signal` | aborted when the client gives up (its `AbortController`, its timeout) |
| `interrupt(ms, value?)` | waits `ms` and resolves with `value` — rejects at once on abort |
| `dispatch(data)` | sends this client something before the result |
| `dispatchToAll(data)` | sends every connected client |
| `getConnections()` | the connections of the pool |

Called after an `await` or outside an exported method, `useCall()` throws at once: by then another call may be running,
and JavaScript can't tell which one is this. Kept in a variable, the context stays right after any `await`.

---

## RpcCoder — low-level serialization

`RpcCoder` serializes arbitrary data (including functions, Symbols, and Promises) into a JSON-compatible wire format. `RpcClient` and `RpcConnect` use it internally; you only need it directly when building a custom transport layer.

### Asymmetric pair model

**Each side of the channel must have its own `RpcCoder` instance.** The two coders form a pair — client and server — and their roles are strictly asymmetric:

- The **client coder** encodes data that originates on the client and decodes data that comes from the server.
- The **server coder** encodes data that originates on the server and decodes data that comes from the client.

A coder maintains separate registries for its own functions ("internals") and for functions received from the other side ("externals"). **A coder must never decode what it encoded itself.** If it did, it would try to resolve internal function indices against the external registry — which is incorrect and produces undefined behaviour.

```ts
import { RpcCoder } from 'fundamentool/rpc';

// Wire up the pair so each coder's encode feeds the other's decode.
const clientCoder = new RpcCoder((fnIndex: number) => {
  return (...args: any[]) => serverCoder.invoke(fnIndex, args);
});

const serverCoder = new RpcCoder((fnIndex: number) => {
  return (...args: any[]) => clientCoder.invoke(fnIndex, args);
});

// Client encodes → server decodes:
const wire = clientCoder.encode({ name: 'Alice', greet(text: string) { return text; } });
const decoded = serverCoder.decode(wire);
// decoded.greet('hello') calls back into clientCoder.invoke → runs the original function on the client.

// Server encodes → client decodes (symmetric, opposite direction):
const reply = serverCoder.encode({ result: 42 });
const clientSide = clientCoder.decode(reply);
```

### Why the asymmetry exists

When the client sends a function as an argument, the client coder registers it as an internal and sends only its numeric index over the wire. The server coder registers that index as an external stub — a proxy that, when called, routes back to the client's `invoke`. If the same coder tried to decode its own output, it would look up the index in the wrong registry and fail to reconstruct the correct call path.
