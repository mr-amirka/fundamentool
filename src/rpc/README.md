# rpc

> [Русская версия](README.ru.md)

Type-safe bidirectional RPC over any message channel (Worker, WebSocket, iframe, etc.).

| Entry point | Contents |
|-------------|----------|
| `fundamentool/rpc` | Universal core: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder` |
| `fundamentool/rpc/browser` | Browser workers: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js workers: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool` |

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
