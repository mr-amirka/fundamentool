// The reactive core's types (fundamentool D-049: they keep to Effector's behaviour).

/** What `watch` returns: call it — or its `unsubscribe` — to stop watching (Effector's `Subscription`). */
export type Unsubscribe = (() => void) & {
  unsubscribe(): void;
};

/** Callback passed to `watch`. */
export type Watcher<T> = (state: T) => void;

/**
 * A store — a value that is (Effector's `Store`): read it, watch it, derive from it.
 *
 * @example
 * const $count: Observable<number> = createObservable(0);
 * $count.watch((count) => render(count)); // at once with 0, then on every change
 */
export interface Observable<T> {
  /** The value now. */
  getState(): T;
  /** Calls `fn` at once with the current value, then on every change (an equal value — `===` — is no change). */
  watch(fn: Watcher<T>): Unsubscribe;
  /**
   * A store derived by `fn`: it changes when `fn`'s result does. It follows its source only while something watches
   * it — one made and dropped (in a render, say) holds nothing.
   */
  map<U>(fn: (state: T) => U): Observable<U>;
}

/** Observable with write access. */
/**
 * Any store, read-only — `getState` + `watch`: fundamentool's (`createObservable`, a derived one) or effector's. What
 * code that only reads a store takes (`useUnit`, a navigator's gate).
 */
export type TStore<T = unknown> = Pick<Observable<T>, 'getState' | 'watch'>;

export type ObservableWritable<T> = Observable<T> & {
  setState(next: T): void;
};

/**
 * An event made from another — `map`, `filter` (Effector's derived event): it fires when its source does, and is
 * watched, never called. It follows its source only while something watches it, as a derived store does.
 *
 * @example
 * const edited = createEvent<string>();
 * const docs = edited.filter({ fn: (file) => file.endsWith('.md') }).map((file) => file.toUpperCase());
 * docs.watch((file) => console.log(file));
 * edited('a.ts'); edited('b.md'); // logs "B.MD"
 */
export type TEventDerived<T> = {
  /** Calls `fn` with each payload — on calls only, never at subscription. */
  watch(fn: (payload: T) => void): Unsubscribe;
  /** An event of `fn`'s result for each payload. */
  map<U>(fn: (payload: T) => U): TEventDerived<U>;
  /** An event of the payloads `fn` keeps; a type guard narrows its payload. */
  filter<S extends T>(config: { fn: (payload: T) => payload is S }): TEventDerived<S>;
  filter(config: { fn: (payload: T) => boolean }): TEventDerived<T>;
};

/**
 * An event — something that happens (Effector's `Event`): calling it hands the payload to its watchers and returns it;
 * `watch` fires on calls only, never at subscription.
 *
 * @example
 * const saved = createEvent<string>();
 * saved.watch((id) => toast(`saved ${id}`));
 * saved('note-7');
 */
export type TEvent<T> = ((payload: T) => T) & TEventDerived<T> & {
  /** An event that calls this one with `fn`'s result: a caller's own shape turned into this event's payload. */
  prepend<B>(fn: (payload: B) => T): TEvent<B>;
};

/** Pair of observable factory functions — inject to swap the implementation (e.g. effector). */
export type TObservableAdapter = {
  createObservable: <T>(initial: T) => ObservableWritable<T>;
  createApi: <T, E extends Record<string, (state: T, payload: any) => T>>(
    store: ObservableWritable<T>,
    shape: E,
  ) => { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
};
