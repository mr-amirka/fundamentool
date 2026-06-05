# fundamentool

> [Русская версия](README.ru.md)

TypeScript utility library — string, object, array, async, type predicates, RPC, JSONL, Node.js tools and more.

## Installation

```bash
npm install fundamentool
```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Tests

```bash
npm test
```

## API docs

Generate Typedoc into `docs/`:

```bash
npm run docs:api
```

---

## Entry points

| Entry point | Contents |
|-------------|----------|
| `fundamentool` | Universal utilities: string, object, array, events, timers, type predicates |
| `fundamentool/async` | Async iteration, parallel execution, sequencing |
| `fundamentool/is` | Type predicates: `isString`, `isEqual`, `isMatch`, and 34 more |
| `fundamentool/join` | String join helpers |
| `fundamentool/split` | String split helpers |
| `fundamentool/jsonl` | JSON Lines serialization / deserialization |
| `fundamentool/browser` | Browser utilities: WebSocket, storage, routing, DI providers |
| `fundamentool/node` | Node.js utilities: file I/O (CSV, JSON, JSONL), hashing, directory scan |
| `fundamentool/rpc` | RPC core: `RpcClient`, `RpcConnect`, `RpcClientPool`, `RpcCoder` |
| `fundamentool/rpc/browser` | Browser worker RPC: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js worker RPC: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool` |

---

## Module overview

### Universal (`fundamentool`)

**Events:** `attachEvent`, `EventEmitter`, `subscribe`, `Unsubscriber`  
**Timers:** `wait`, `createTimeout`, `createInterval`, `createAnimationFrame`, `queueProvider`, `sendingQueue`  
**URL:** `urlParse`, `urlExtend`, `unparam`, `param`, `routeParseProvider`  
**Strings:** `half`, `trim`, `toLower`, `toUpper`, `lowerFirst`, `upperFirst`, `repeat`, `escapeRegExp`, case converters (`kebabToCamelCase`, `snakeToCamelCase`, …)  
**Objects & arrays:** `merge`, `extend`, `without`, `withoutEmpty`, `pick`, `set`, `get`, `keys`, `values`, `entries`, `fromPairs`, `push`, `pushArray`, `find`, `findIndex`, `indexOf`, `includes`, `some`, `every`, `sort`, `sortBy`, `uniqWith`  
**Templates:** `templateProvider`, `convertToBreakLineHTML`, `formatTime`, `dateToUTCString`  
**Misc:** `noop`, `getUniqId`, `tryJsonParse`, `cloneDepth`, `globalContext`, `variants`, `variantsProvider`

### Async (`fundamentool/async`)

`mapAsync`, `filterAsync`, `findAsync`, `forEachAsync`, `reduceAsync`, `sequence`, `loopAsync`, `intervalAsync`, `withDelayAsync`, parallel variants — see [src/async/README.md](src/async/README.md).

### Type predicates (`fundamentool/is`)

37 `isXxx()` guards with full TypeScript narrowing — see [src/is/README.md](src/is/README.md).

### RPC (`fundamentool/rpc`)

Type-safe bidirectional RPC over any message channel — see [src/rpc/README.md](src/rpc/README.md).

### Node.js (`fundamentool/node`)

File I/O, JSONL streaming, CSV, directory scan — see [src/node/README.md](src/node/README.md).

### Browser (`fundamentool/browser`)

WebSocket helpers, storage providers, viewport utilities — see [src/browser/README.md](src/browser/README.md).

### JSONL (`fundamentool/jsonl`)

See [src/jsonl/README.md](src/jsonl/README.md).

---

## License

MIT
