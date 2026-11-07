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
| `fundamentool/schema` | Option schemas with zod's names: `object`, `array`, `string`, … — the check, the type and the key list from one description ([README](src/schema/README.md)) |
| `fundamentool/css` | CSS values from short text in a spelling the caller gives: math with units (`100%-2*$gap` → `calc(100% - 2 * var(--gap))`), variables, colours, gradients; `cssMediaCondition`, `childCombinator` ([README](src/css/README.md)) |
| `fundamentool/source` | Strings from source code without running it: comments blanked with the length kept, the strings an expression can be (`on ? 'a' : 'b'` → `a`, `b`), strings at places by name (attributes, variables, calls) by text or by TypeScript's parser given as an argument; `sfcParts`, `applyEdits` ([README](src/source/README.md)) |
| `fundamentool/match` | A filter as data: a pattern compiled once into a predicate (`matchProvider`), the same pattern as a tree for SQL (`normalizeMatch`), operators a project extends (`STANDARD_OPERATORS`) ([README](src/match/README.md)) |
| `fundamentool/hooks` | Named moments a host lets presets act at: four kinds of sync hook (`eachHook`, `waterfallHook`, `bailHook`, `chainHook`), hooks by key (`hookMap`), a host's hooks by name (`namedHooks`), the order of presets by what they require (`orderPresets`) ([README](src/hooks/README.md)) |
| `fundamentool/async/hooks` | The same kinds by the same names for handlers that may wait — a handler returns a value or a promise alike, `run` returns a promise — and `parallelHook`, every handler at once ([README](src/async/hooks/README.md)) |
| `fundamentool/vectors` | The math over embeddings: `nearest` (the closest vectors, filtered before scoring), `fuseRanks` (rankings merged by rank), `toBytes` / `fromBytes`, `chunkText` (whole sentences in pieces a model reads) ([README](src/vectors/README.md)) |
| `fundamentool/embeddings` | Texts in, vectors of unit length out: `createEmbedder` over a model's port, `transformersModel` — a local model, the library passed in by the caller; `rpcModel` / `modelHandlers` — the model in a worker thread or another process ([README](src/embeddings/README.md)) |
| `fundamentool/sql` | A query as data: builders of plain nodes, `matchWhere` (a `match` pattern as a condition with the same rows), a compiler whose node kinds are `fundamentool/hooks` chains so a dialect is a preset (`sqlite`, `sqliteFts5`), and `sqliteAdapter` — one async shape over better-sqlite3 and `node:sqlite` with transactions and migrations ([README](src/sql/README.md)) |
| `fundamentool/i18n` | Localization: one locale per app, a set of messages per package, read by key constants — `t(K.hud.moves, { count })`; plurals and formats in the message; the Vite plugin `fundamentool/i18n/vite` (a compact build, locales inline or on demand), `fundamentool/i18n/testing` (`checkSet`) ([README](src/i18n/README.md)) |
| `fundamentool/vdom` | ⚠️ A trial (D-072): its own view library with React's API — elements, function components, hooks, contexts, portals, `createRoot` — 5.6 KB gzip; MUI and emotion run on it through bundler aliases to `fundamentool/vdom/react` (D-073); `act` for tests ([README](src/vdom/README.md)) |
| `fundamentool/join` | String join helpers |
| `fundamentool/split` | String split helpers |
| `fundamentool/jsonl` | JSON Lines serialization / deserialization |
| `fundamentool` → `tupleLog` | A log of records as tuples — the type first, the fields by place, the names once in a schema; versions read through each version's `up`, a file only appended ([README](src/tupleLog/README.md)) |
| `fundamentool/browser` | Browser utilities: WebSocket, storage, routing, DI providers |
| `fundamentool/node` | Node.js utilities: file I/O (CSV, JSON, JSONL), hashing, directory scan |
| `fundamentool/rpc` | RPC core: `RpcClient`, `RpcConnect` (a method reaches its call with `useCall()`), `RpcClientPool`, `RpcCoder`; over a WebSocket — `RpcClientWebSocket`, `serveRpcWebSocket` ([README](src/rpc/README.md)) |
| `fundamentool/rpc/browser` | Browser worker RPC: `RpcClientWorker`, `RpcConnectWorker`, `RpcClientWorkerPool` |
| `fundamentool/rpc/node` | Node.js worker RPC: `NodeRpcClientWorker`, `NodeRpcConnectWorker`, `NodeRpcClientWorkerPool`; `rpcStreamTransport` over a socket or stdio |

---

## Module overview

### Universal (`fundamentool`)

**Events:** `createEvent` (effector's: `watch`, `map`, `filter`, `prepend` — [README](src/Observable/README.md)), `attachEvent`, `EventEmitter`, `subscribe`, `Unsubscriber`, `keyedRegistry` (subscriptions by key)  
**Store:** `createStore`, `createApi`, `TStoreAdapter` — reactive store with optional DI (swap implementation via `deps`)  
**Timers:** `wait`, `createTimeout`, `createInterval`, `queueProvider`, `sendingQueue`, `keyedQueue` (background work by key: one item per key, the highest priority first, preemption — [README](src/keyedQueue/README.md)), `withAsyncLock` (ignores calls while one runs — a double tap)  
**Modules:** `dynamicModule` (an async initializer run once — again after a failure; `import()` of a part loaded on demand)  
**URL:** `urlParse`, `urlExtend`, `unparam`, `param`, `routeParseProvider`  
**Strings:** `pairsProvider` / `pairsSchema` (a list option — `'a, b:c'`, `['a', 'b:c']` or `{ b: 'c' }` — read into `[name, value]` pairs, and its check), `half`, `trim`, `toLower`, `toUpper`, `lowerFirst`, `upperFirst`, `repeat`, `escapeRegExp`, case converters (`kebabToCamelCase`, `snakeToCamelCase`, …)  
**Objects & arrays:** `merge`, `extend`, `without`, `withoutEmpty`, `pick`, `set`, `get`, `keys`, `values`, `entries`, `fromPairs`, `push`, `pushArray`, `find`, `findIndex`, `indexOf`, `includes`, `some`, `every`, `sort`, `sortBy`, `uniqWith`  
**Templates:** `templateProvider`, `convertToBreakLineHTML`, `formatTime`, `dateToUTCString`  
**Misc:** `noop`, `getUniqId`, `tryJsonParse`, `cloneDepth`, `globalContext`, `variants`, `variantsProvider`

#### Store DI

All store-backed providers (`localStorageProvider`, `cookieStorageProvider`, `createRouter`, `createNavigator`) accept an optional `deps` parameter so you can substitute the store implementation — e.g. pass effector-compatible factories:

```ts
import { createStore, createApi, TStoreAdapter } from 'fundamentool';

// default — uses built-in store
const storage = localStorageProvider(window);

// custom adapter — e.g. an effector wrapper
const effectorAdapter: TStoreAdapter = { createStore: effector.createStore, createApi: myAdapter };
const storage2 = localStorageProvider(window, effectorAdapter);
```

### Router (`browserHistoryPrimitivesProvider`, `createRouter`, `createNavigator`)

History primitives — three nested parts of every history entry (the address ⊃ its hash ⊃ the entry's state); a router
per part (its location, steps, `params`); a navigator of pages and windows over a router: every page and window is a
history entry, the route table is the only description of the pages (given to the host), tabs keep their own
histories, the stack survives a reload — see [src/router/README.md](src/router/README.md).

### Async (`fundamentool/async`)

`mapAsync`, `filterAsync`, `findAsync`, `forEachAsync`, `reduceAsync`, `sequence`, `loopAsync`, `intervalAsync`, `withDelayAsync`, parallel variants — see [src/async/README.md](src/async/README.md).

### Type predicates (`fundamentool/is`)

37 `isXxx()` guards with full TypeScript narrowing — see [src/is/README.md](src/is/README.md).

### RPC (`fundamentool/rpc`)

Type-safe bidirectional RPC over any message channel — see [src/rpc/README.md](src/rpc/README.md).

### Node.js (`fundamentool/node`)

File I/O, JSONL streaming, CSV, directory scan — see [src/node/README.md](src/node/README.md).

### Browser (`fundamentool/browser`)

WebSocket helpers, storage providers, viewport utilities, animation frames (`createAnimationFrame` — a loop, `nextFrame` — once) — see [src/browser/README.md](src/browser/README.md).

### JSONL (`fundamentool/jsonl`)

See [src/jsonl/README.md](src/jsonl/README.md).

---

## License

MIT
