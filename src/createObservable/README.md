# `createObservable` — a store and the stores derived from it

[Русская версия](./README.ru.md)

fundamentool's stores keep to **Effector's behaviour** (fundamentool D-049) — what an app writes against them works the
same when effector is injected in their place (`TObservableAdapter`), and the ground is laid for fundamentool's own
Effector (D-048). Events are [`createEvent`](../createEvent/README.md); events that update a store, `createApi`
(`src/createApi.ts`); `isStore(unit)` (`fundamentool/is`) tells a store from an event.

## When you need it

- A value that other code and the UI watch and react to on each change — the app's state, a store (as Effector's).
- A value computed from another, which changes only when its result does.
- A store updated by events (`createApi`); code that works the same over effector's stores.

```ts
const $count = createObservable(0);                  // a store — a value that is
$count.watch((count) => render(count));              // at once with 0, then on every change
$count.setState(1);                                  // an equal value (===) is no change

const $even = $count.map((count) => count % 2 === 0); // a derived store: changes when the result does

const api = createApi($count, { add: (count, n: number) => count + n }); // events that update a store
api.add(2);                                          // their watchers see the store already updated
```

| Behaviour | As in Effector |
|-----------|----------------|
| a store's `watch` fires **at once** with the current value, then on every change | `store.watch` |
| an equal value (`===`) is no change | yes |
| `watch` returns a function that is also `{ unsubscribe }` | `Subscription` |
| `map` changes only when its result does | yes |
| `createApi` returns events (callable — they return the payload; watchable) | yes |
| a watcher that throws is logged; the others still run | yes |

**One difference, on purpose: `map` holds nothing while nobody watches it.** It subscribes to its source with its first
watcher and unsubscribes after its last; unwatched, it is computed when read (once per source value). A derived store
made and dropped — in a component's render, say — leaks no watcher.

**A change copies nothing** (D-112): the watchers' list is replaced when one subscribes or unsubscribes, and a change
reads the list it starts with — a watcher added during a change got the value at its subscription.

Not yet — they come with fundamentool's own Effector: `store.updates`, `store.on / reset`, `combine`, `sample`,
scopes. Not adopted: a reducer's `undefined` skipped (`skipVoid`, deprecated in effector itself). The full comparison —
research 12 (`PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/`).

Code that only reads a store takes a `TStore` (`getState` + `watch` — fundamentool's or effector's: `useUnit`, a
navigator's gate).

## Files

| File | What's in it |
|------|--------------|
| `index.ts` | `createObservable` |
| `types.ts` | `Observable`, `ObservableWritable`, `TStore`, `TObservableAdapter` |
| `../watchers/` | the watchers' list both stores and events keep; `Unsubscribe`, `Watcher` |
