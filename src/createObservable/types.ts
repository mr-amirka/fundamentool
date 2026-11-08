// A store's types (fundamentool D-049: they keep to Effector's behaviour).
import type {
  Unsubscribe,
  Watcher,
} from '../watchers';

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

/**
 * Any store, read-only — `getState` + `watch`: fundamentool's (`createObservable`, a derived one) or effector's. What
 * code that only reads a store takes (`useUnit`, a navigator's gate).
 */
export type TStore<T = unknown> = Pick<Observable<T>, 'getState' | 'watch'>;

/** A store with write access. */
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
