# `createEvent` — an event and the events derived from it

[Русская версия](./README.ru.md)

An event as Effector's (fundamentool D-049, D-105): something that happens, passed from where it happens to whoever
acts on it. This is the lab's event; `EventEmitter` is kept as a light utility for code that expects Node's pattern
(D-111). Stores are [`createObservable`](../createObservable/README.md).

## When you need it

- Something that happens — a click, a save, a message, a file an agent just edited — that others subscribe to.
- A trigger narrowed (`filter`) or reshaped (`map`, `prepend`) on its way to whoever acts on it.
- A class that owns an event: a private `createEvent()`, a public `watch`.

```ts
const saved = createEvent<string>();                 // an event — something that happens
const stop = saved.watch((id) => toast(id));         // on calls only, never at subscription
saved('note-7');                                     // toast('note-7'); returns 'note-7'
const docs = saved.filter({ fn: (id) => id.startsWith('doc-') }).map((id) => id.slice(4)); // derived events
docs.watch((name) => open(name));
saved('doc-plan');                                   // toast('doc-plan'), then open('plan')
const savedNote = saved.prepend((note: { id: string }) => note.id); // calling it calls saved with note.id
stop();
```

| Behaviour | As in Effector |
|-----------|----------------|
| `watch` fires on calls only | `event.watch` |
| calling the event returns its payload | yes |
| `watch` returns a function that is also `{ unsubscribe }` | `Subscription` |
| `event.map(fn)`, `event.filter({ fn })` — derived events, watched, never called (`TEventDerived`) | yes |
| `event.prepend(fn)` — an event that calls this one with `fn`'s result | yes |
| a watcher that throws is logged; the others still run | yes |

A derived event holds nothing while nobody watches it: it watches its source from its first watcher to its last
(D-105). **A call copies nothing** (D-112): the watchers' list is replaced when one subscribes or unsubscribes, and a
call reads the list it starts with — a watcher added during a call hears the next one.

Not yet: `event.filterMap`, `sample`, scopes — with fundamentool's own Effector.

## Files

| File | What's in it |
|------|--------------|
| `index.ts` | `createEvent` |
| `types.ts` | `TEvent`, `TEventDerived` |
