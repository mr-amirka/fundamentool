# The reactive core: stores, derived stores, events

[Русская версия](./README.ru.md)

fundamentool's reactive API keeps to **Effector's behaviour** (fundamentool D-049) — what an app writes against it
works the same when effector is injected in its place (`TObservableAdapter`), and the ground is laid for fundamentool's
own Effector (D-048).

## When you need it

- A value that other code and the UI watch and react to on each change — the app's state, a store (as Effector's).
- A value computed from another, which changes only when its result does.
- Something that happens — a click, a save, a message, a file an agent just edited — that others subscribe to: an
  event; a trigger passed from where it happens to whoever acts on it, narrowed (`filter`) or reshaped (`map`,
  `prepend`) on the way.
- Events that update a store (`createApi`); code that works the same over effector's stores.

```ts
const $count = createObservable(0);                  // a store — a value that is
$count.watch((count) => render(count));              // at once with 0, then on every change
$count.setState(1);                                  // an equal value (===) is no change

const $even = $count.map((count) => count % 2 === 0); // a derived store: changes when the result does

const saved = createEvent<string>();                 // an event — something that happens
saved.watch((id) => toast(id));                      // on calls only, never at subscription
saved('note-7');                                     // returns its payload
const docs = saved.filter({ fn: (id) => id.startsWith('doc-') }).map((id) => id.slice(4)); // derived events
const savedNote = saved.prepend((note: { id: string }) => note.id); // calling it calls saved with note.id

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
| `event.map(fn)`, `event.filter({ fn })` — derived events, watched, never called (`TEventDerived`) | yes |
| `event.prepend(fn)` — an event that calls this one with `fn`'s result | yes |

**One difference, on purpose: `map` holds nothing while nobody watches it.** It subscribes to its source with its first
watcher and unsubscribes after its last; unwatched, it is computed when read (once per source value). A derived store
made and dropped — in a component's render, say — leaks no watcher. A derived event (`map`, `filter`) is the same: its
function runs only while something watches it (fundamentool D-105).

Not yet — they come with fundamentool's own Effector: `store.updates`, `store.on / reset`, `event.filterMap`,
`combine`, `sample`, scopes. Not adopted: a reducer's `undefined` skipped (`skipVoid`, deprecated in effector
itself). The full comparison — research 12 (`PROJECTS_CONTEXT/fundamentool/AGENT_DRAFT/RESEARCH/`).

Code that only reads a store takes a `TStore` (`getState` + `watch` — fundamentool's or effector's: `useUnit`, a
navigator's gate); `isStore(unit)` tells a store from an event.

## Files

| File | What's in it |
|------|--------------|
| `index.ts` | `createObservable`, `createEvent`, `createApi`, `isStore` |
| `types.ts` | `Observable`, `ObservableWritable`, `TStore`, `TEvent`, `TEventDerived`, `Unsubscribe`, `TObservableAdapter` |
