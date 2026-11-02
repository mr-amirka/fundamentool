# async/hooks — named moments whose handlers may wait

[Русская версия](./README.ru.md)

`fundamentool/async/hooks` (fundamentool D-091, lab D-046, D-050): the hooks of
[`fundamentool/hooks`](../../hooks/README.md) for a host whose handlers may wait — a link checked over the network before
a write, a search index updated after it, a resolver reading a store. The same four kinds by the same names, and
`parallelHook`. A handler may return a value or a promise: the hook awaits both alike.

```ts
import { waterfallHook, eachHook, parallelHook, bailHook, chainHook, namedHooks } from 'fundamentool/async/hooks';

const hooks = {
  beforeWrite: waterfallHook<TChange>({ name: '[documents] beforeWrite' }),
  afterWrite: parallelHook<TChange>({ name: '[documents] afterWrite' }),
  resolve: bailHook<TStep, TNode[]>({ name: '[documents] resolve' }),
};

hooks.beforeWrite.add(async (change) => (await linkExists(change.link) ? undefined : { ...change, link: undefined }));
hooks.beforeWrite.add((change) => (change.accepted ? undefined : { ...change, accepted: now() })); // doesn't wait — fine
const change = await hooks.beforeWrite.run(proposed);
await hooks.afterWrite.run(change); // every handler started at once; resolves when all are done
```

| Member | What it is |
|--------|-----------|
| `eachHook<T>()` | Every handler is told, in series: each starts after the previous one settled |
| `parallelHook<T>()` | Every handler is told, all at once; `run` settles when every one did |
| `waterfallHook<T>()` | Each handler gets what the previous one resolved to; `undefined` keeps the value |
| `bailHook<T, R>()` | The first answer; the next handler is asked only after the previous one resolved `undefined` |
| `chainHook<T, R>()` | Middleware, as Koa's and Mongoose's: a handler awaits `next` to reach the rest, or answers itself |
| `hookMap`, `namedHooks`, `orderPresets`, `presetSetup`, `hookError` | `fundamentool/hooks`' own, re-exported: they don't depend on the mode |

Every `run` returns a promise. The order (`pre`, `post`, "a later handler has the last word"), the removal, the run's
own list of handlers and the error naming are `fundamentool/hooks`' core, imported, not copied — they behave as its
README says.

## `parallelHook`

```ts
const afterWrite = parallelHook<TChange>({ name: '[documents] afterWrite' });
afterWrite.add((change) => search.update(change), { by: 'presetSearch' });
afterWrite.add((change) => mirror.push(change), { by: 'presetMirror' });
await afterWrite.run(change);
```

```
run(change) → presetSearch starts → presetMirror starts → both settle → run settles
```

The handlers start in running order. `run` waits for every one of them, so none is left running unobserved. One failure
rejects with its named error; several with an `AggregateError` of them in running order — none is dropped:

```
[documents] afterWrite: 2 handlers threw
  [documents] afterWrite: the handler of presetSearch threw: …
  [documents] afterWrite: the handler of presetMirror threw: …
```

It is a kind of its own, not an option of `eachHook`: series and all-at-once are two behaviours a host picks once
(lab D-050), as Tapable's `AsyncSeriesHook` and `AsyncParallelHook` are two classes.

## Which module

| The handlers | Module |
|--------------|--------|
| pure work on a hot path — the SQL compiler writing a node's text | `fundamentool/hooks` |
| may wait — I/O, a store, the network, a Worker | `fundamentool/async/hooks` |

The SQL compiler takes `fundamentool/hooks`: a dialect never needs I/O to write a node, and the chains run for every node
of every query. The documents' host takes this module. A host doesn't mix the two for one moment.

`fundamentool/async` doesn't re-export this module: its names are the sync module's, and `fundamentool/async` is
re-exported by the package's root.
