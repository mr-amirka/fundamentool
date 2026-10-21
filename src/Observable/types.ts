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
export type ObservableWritable<T> = Observable<T> & {
  setState(next: T): void;
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
export type TEvent<T> = ((payload: T) => T) & {
  watch(fn: (payload: T) => void): Unsubscribe;
};

/** Pair of observable factory functions — inject to swap the implementation (e.g. effector). */
export type TObservableAdapter = {
  createObservable: <T>(initial: T) => ObservableWritable<T>;
  createApi: <T, E extends Record<string, (state: T, payload: any) => T>>(
    store: ObservableWritable<T>,
    shape: E,
  ) => { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
};
