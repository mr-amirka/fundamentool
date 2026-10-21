# The reactive core: stores, derived stores, events

[Русская версия](./README.ru.md)

fundamentool's reactive API keeps to **Effector's behaviour** (fundamentool D-049) — what an app writes against it
works the same when effector is injected in its place (`TObservableAdapter`), and the ground is laid for fundamentool's
own Effector (D-048).

```ts
const $count = createObservable(0);                  // a store — a value that is
$count.watch((count) => render(count));              // at once with 0, then on every change
$count.setState(1);                                  // an equal value (===) is no change

const $even = $count.map((count) => count % 2 === 0); // a derived store: changes when the result does

const saved = createEvent<string>();                 // an event — something that happens
saved.watch((id) => toast(id));                      // on calls only, never at subscription
saved('note-7');                                     // returns its payload

const api = createApi($count, { add: (count, n: number) => count + n }); // events that update a store
api.add(2);                                          // its watchers see the store already updated
```

| Behaviour | As in Effector |
|-----------|----------------|
| a store's `watch` fires **at once** with the current value, then on every change | `store.watch` |
| an equal value (`===`) is no change | yes |
| `watch` returns a function that is also `{ unsubscribe }` | `Subscription` |
| `map` changes only when its result does | yes |
| an event's `watch` fires on calls only | `event.watch` |
| `createApi` returns events (callable — they return the payload; watchable) | yes |
| a watcher that throws is logged; the others still run | yes |

**One difference, on purpose: `map` holds nothing while nobody watches it.** It subscribes to its source with its first
watcher and unsubscribes after its last; unwatched, it is computed when read (once per source value). A derived store
made and dropped — in a component's render, say — leaks no watcher.

Not yet — they come with fundamentool's own Effector: `store.updates`, `store.on / reset`, `event.map / filter /
prepend`, `combine`, `sample`, scopes. Not adopted: a reducer's `undefined` skipped (`skipVoid`, deprecated in effector
itself). The full comparison — research 12 (`PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/`).

Code that only reads a store takes a `TStore` (`getState` + `watch` — fundamentool's or effector's: `useUnit`, a
navigator's gate); `isStore(unit)` tells a store from an event.

## Files

| File | What's in it |
|------|--------------|
| `index.ts` | `createObservable`, `createEvent`, `createApi`, `isStore` |
| `types.ts` | `Observable`, `ObservableWritable`, `TStore`, `TEvent`, `Unsubscribe`, `TObservableAdapter` |
