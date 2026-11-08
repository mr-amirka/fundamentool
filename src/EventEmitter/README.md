# `EventEmitter` — the base class of a class with an event model

[Русская версия](./README.ru.md)

One of the most expected patterns, kept as a light abstraction (fundamentool D-111): a class extends it and becomes a
source of events — it fires with the protected `emit`, its users `subscribe`. It leaves the choice to the library's
users and serves as the base of the lab's own emitters (`RpcClient`, `RpcClientPool`: a server's dispatches).

## When you need it

- A class whose instances have an event model: a client that hears its server, a connection, a device, a worker.
- A type to accept: `IEventEmitter<T>` — anything with `subscribe`, `clear`, `destroy`.

```ts
class Saver extends EventEmitter<string> {
  save(id: string) { /* … */ this.emit(id); }
}
const saver = new Saver();
const off = saver.subscribe((id) => console.log('saved', id));
saver.once((id) => console.log('the first save', id));
saver.save('note-7'); // logs "saved note-7", then "the first save note-7"
saver.save('note-8'); // logs "saved note-8"
off();
saver.destroy();      // no listener left; a later subscribe hears nothing
```

| Member | What it does |
|--------|--------------|
| `subscribe(...listeners)` | adds them; returns one function removing them all |
| `once(...listeners)` | as `subscribe`, removed after the first event |
| `protected emit(data)` | calls each listener; one that throws is logged, the rest still run |
| `clear()` | drops every listener; the emitter lives on |
| `destroy()` | drops every listener; later `subscribe` does nothing |

An `emit` copies nothing (D-112): the list is replaced on subscribing and unsubscribing; a listener added during an
`emit` hears the next one, one removed during it still hears it.

## Beside it: `createEvent`

| You need | Take |
|----------|------|
| a class that *is* a source of events | `EventEmitter` — `extends` |
| a standalone event of an app's state, in Effector's shape: callable, derived events (`map`, `filter`, `prepend`), feeding a store (`createApi`) | [`createEvent`](../createEvent/README.md) |
