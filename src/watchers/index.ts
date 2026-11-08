/**
 * The watchers of a store or an event (fundamentool D-112): a list replaced on each subscribe and unsubscribe, never
 * changed in place — a call reads the list it starts with, so it copies nothing. Subscribing is rare and calls are
 * many: the copy is paid where it is rare.
 */

/** What `watch` returns: call it — or its `unsubscribe` — to stop watching (Effector's `Subscription`). */
export type Unsubscribe = (() => void) & {
  unsubscribe(): void;
};

/** Callback passed to `watch`. */
export type Watcher<T> = (state: T) => void;

/** A watch's handle: a function that is also `{ unsubscribe }` (Effector's `Subscription`). */
export function subscription(stop: () => void): Unsubscribe {
  const handle = stop as Unsubscribe;
  handle.unsubscribe = stop;
  return handle;
}

/** Calls a watcher; one that throws neither stops the others nor reaches the caller — it is logged. */
export function notify<T>(fn: Watcher<T>, value: T): void {
  try {
    fn(value);
  } catch (error) {
    console.error('watchers:error', error);
  }
}

/**
 * Calls every watcher of `list` with `value`. A watcher added during the call isn't in `list` — it hears the next
 * one; one removed during the call still hears this one.
 */
export function notifyAll<T>(list: readonly Watcher<T>[], value: T): void {
  const length = list.length;
  for (let i = 0; i < length; i++) {
    notify(list[i], value);
  }
}

/** A new list with `fn` last; the same list when `fn` is in it already (one watcher, as a `Set` keeps it). */
export function withWatcher<T>(list: readonly Watcher<T>[], fn: Watcher<T>): readonly Watcher<T>[] {
  return list.includes(fn) ? list : [
    ...list,
    fn,
  ];
}

/** A new list without `fn`; the same list when `fn` isn't in it. */
export function withoutWatcher<T>(list: readonly Watcher<T>[], fn: Watcher<T>): readonly Watcher<T>[] {
  const index = list.indexOf(fn);
  if (index < 0) {
    return list;
  }
  const next = list.slice();
  next.splice(index, 1);
  return next;
}
