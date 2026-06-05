# Getting Started

## Installation

```bash
npm install fundamentool
```

## Entry points

fundamentool is split into focused entry points — import only what you need:

| Entry point | Contents |
|-------------|----------|
| `fundamentool` | Universal utilities (string, object, array, etc.) |
| `fundamentool/async` | Async iteration, parallel execution, sequencing |
| `fundamentool/is` | Type predicates (`isString`, `isEqual`, `isMatch`, …) |
| `fundamentool/browser` | Browser utilities (WebSocket, storage, routing) |
| `fundamentool/node` | Node.js utilities (file I/O, hashing, directory scan) |
| `fundamentool/rpc` | RPC core (`RpcClient`, `RpcConnect`, `RpcClientPool`) |
| `fundamentool/rpc/browser` | Browser worker RPC |
| `fundamentool/rpc/node` | Node.js worker RPC |
| `fundamentool/jsonl` | JSON Lines serialization |
| `fundamentool/join` | Join utilities |
| `fundamentool/split` | Split utilities |

## Basic usage

```ts
import { isString, isEqual } from 'fundamentool/is';
import { mapAsync } from 'fundamentool/async';
import { NodeRpcClientWorker } from 'fundamentool/rpc/node';

isString('hello');       // true
isEqual({ a: 1 }, { a: 1 }); // true

const results = await mapAsync([1, 2, 3], async (n) => n * 2);
// [2, 4, 6]
```

## RPC example

```ts
// worker.ts
import { NodeRpcConnectWorker } from 'fundamentool/rpc/node';
NodeRpcConnectWorker.run({
  add: (a: number, b: number) => a + b,
});

// main.ts
import { NodeRpcClientWorker } from 'fundamentool/rpc/node';
const worker = new NodeRpcClientWorker('./worker.js');
const result = await worker.call('add', [3, 4]); // 7
worker.destroy();
```
