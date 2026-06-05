# async

> [Русская версия](README.ru.md)

Async utilities for collections and control flow.

```ts
import * as async from 'fundamentool/async';
import { mapAsync, sequence, intervalAsync } from 'fundamentool/async';
```

---

## Primitives

| Function | Description |
|----------|-------------|
| `loopAsync(fn)` | Async while-loop: calls `fn` repeatedly until it returns falsy |
| `intervalAsync(fn, ms)` | Runs `fn` every `ms` ms, awaiting completion before the next tick |
| `checkNoop` | Default predicate stub — always returns `true` |

```ts
const stop = intervalAsync(async () => {
  await processQueue();
}, 1000);
setTimeout(stop, 5000); // stop after 5 s
```

---

## Sequential iteration

| Function | Description |
|----------|-------------|
| `forEachAsync(arr, fn)` | Sequential async forEach over an array |
| `forInAsync(obj, fn)` | Sequential async forEach over an object |
| `eachAsync(col, fn)` | Picks `forEachAsync` or `forInAsync` based on collection type |

---

## Sequential transformations

| Function | Description |
|----------|-------------|
| `mapAsync(arr, fn)` | Async `map` for arrays |
| `mapInAsync(obj, fn)` | Async `map` for objects |
| `filterAsync(arr, fn)` | Async `filter` for arrays |
| `filterInAsync(obj, fn)` | Async `filter` for objects |
| `findAsync(arr, fn)` | Async `find` for arrays |
| `findInAsync(obj, fn)` | Async `find` for objects |
| `reduceAsync(arr, fn, init)` | Async `reduce` for arrays |
| `reduceInAsync(obj, fn, init)` | Async `reduce` for objects |

```ts
const pages = await mapAsync([1, 2, 3], async (n) => {
  return fetch(`/api/page/${n}`).then(r => r.json());
});
```

---

## Parallel versions

Every function above has a `Parallel` counterpart that runs all iterations concurrently:

`loopParallel`, `forEachParallel`, `forInParallel`, `eachParallel`,
`mapParallel`, `mapInParallel`, `filterParallel`, `filterInParallel`,
`findParallel`, `findInParallel`, `reduceParallel`, `reduceInParallel`

```ts
const results = await mapParallel([url1, url2, url3], async (url) => {
  return fetch(url).then(r => r.json());
});
```

---

## Function wrappers

| Function | Description |
|----------|-------------|
| `withDelayAsync(fn, ms)` | Debounce that returns a Promise of the result |
| `sequence(fn)` | Queues calls — each waits for the previous to finish |
| `sequenceDelay(fn, ms)` | Like `sequence` but adds a delay between calls |
| `withLatencyProvider(fn, minMs)` | Ensures calls take at least `minMs` ms (prevents UI flicker) |

```ts
const save = sequence(async (data) => api.save(data));
save(data1); // starts immediately
save(data2); // waits for data1 to finish

const load = withLatencyProvider(fetchData, 300); // min 300 ms
```
