/** Function returned by `watch` — call it to remove the watcher. */
export type Unsubscribe = () => void;

/** Callback passed to `watch`. */
export type Watcher<T> = (state: T) => void;

/**
 * Read-only observable.
 *
 * @example
 * const observable: Observable<number> = createObservable(0);
 * observable.watch((v) => console.log(v));
 */
export interface Observable<T> {
  getState(): T;
  watch(fn: Watcher<T>): Unsubscribe;
  map<U>(fn: (state: T) => U): Observable<U>;
}

/** Observable with write access. */
export type ObservableWritable<T> = Observable<T> & {
  setState(next: T): void;
};

/** Pair of observable factory functions — inject to swap the implementation (e.g. effector). */
export type TObservableAdapter = {
  createObservable: <T>(initial: T) => ObservableWritable<T>;
  createApi: <T, E extends Record<string, (state: T, payload: any) => T>>(
    store: ObservableWritable<T>,
    shape: E,
  ) => { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
};
