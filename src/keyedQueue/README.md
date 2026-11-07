# keyedQueue — background work by key

[Русская версия](./README.ru.md)

Work put under a key with a priority; one worker takes the highest first, a batch at a time (fundamentool D-106). The
same key put again before it runs stays one item — its latest value, its higher priority.

## When you need it

- Work that comes in bursts and only the last state matters: a file saved five times in a second is indexed once; a
  node changed twice is embedded once, with its latest text.
- Background work where some items must jump the line: what a user just edited before the rest of a backlog; approved
  decisions before other text.
- A long background run that something urgent should interrupt (`preempt`): the run is aborted by its signal, its batch
  put back, the urgent item taken first.
- One worker at a time over a shared resource — a database, a model — with work queued from many places (a watcher, a
  hook, a request).
- A background job that must never halt what it serves: a failed run is kept to show (`error()`), the queue goes on.

```ts
import { keyedQueue } from 'fundamentool';

const queue = keyedQueue<string, 'edited' | 'watched'>({
  run: async (batch, signal) => {          // highest priority first; signal aborts on stop or preemption
    await reindex(batch.map((item) => item.key), signal);
  },
  batch: Infinity,                         // all queued at once (default 1)
  preempt: true,                           // a higher priority aborts a lower run; its batch comes again
});

queue.put('docs/a.md', 'watched', 1);
queue.put('docs/a.md', 'edited', 2);      // one item: value 'edited', priority 2
queue.put('*', 'watched', 0);             // after, unless something higher comes
await queue.settled();                    // nothing queued, no run going
queue.error();                            // the last failed run's error, or undefined
await queue.stop();                       // queue dropped, the run aborted and waited for
```

## Behaviour

| Case | What happens |
|------|--------------|
| a key put again while queued | one item: the latest value, the higher priority, its place among equals the first put's |
| a key put while its batch runs | queued again, runs after (the worker saw the older value) |
| equal priorities | in the order their keys were first put |
| `preempt` and an item above the running batch's lowest priority | the run's signal aborts; when the run ends, its batch is put back under what was put since (newer values win) — the worker must be fine with doing an item again |
| a run throws (not stopped, not preempted) | `onError(error, batch)`; its items are dropped (put them again); `error()` keeps it until a run ends well |
| `stop()` | queue dropped, the run aborted and waited for, no failure kept; `put` after it does nothing |

Not here, by design: persistence (the queue is memory — its source of truth is the caller's, read again on restart),
several workers at once (one owner of the writes), retries with a delay (the caller puts again — a door: an `onError`
that does it).

## Files

| File | What's in it |
|------|--------------|
| `index.ts` | `keyedQueue`, `TKeyedQueue`, `TKeyedQueueOptions`, `TQueued` |
