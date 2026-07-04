/** Function returned by `watch` — call it to remove the watcher. */
export type Unsubscribe = () => void;

/** Callback passed to `watch`. */
export type Watcher<T> = (state: T) => void;

/**
 * Read-only store.
 *
 * @example
 * const store: Store<number> = createStore(0);
 * store.watch((v) => console.log(v));
 */
export interface Store<T> {
  getState(): T;
  watch(fn: Watcher<T>): Unsubscribe;
  map<U>(fn: (state: T) => U): Store<U>;
}

/** Store with write access. */
export type StoreWritable<T> = Store<T> & {
  setState(next: T): void;
};

/** Pair of store factory functions — inject to swap the store implementation (e.g. effector). */
export type TStoreAdapter = {
  createStore: <T>(initial: T) => StoreWritable<T>;
  createApi: <T, E extends Record<string, (state: T, payload: any) => T>>(
    store: StoreWritable<T>,
    shape: E,
  ) => { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
};
