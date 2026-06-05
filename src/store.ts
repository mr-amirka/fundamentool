import { forIn } from "./forIn";

/**
 * A function that unsubscribes from a store.
 * 
 * @returns A function that unsubscribes from a store.
 */
export type Unsubscribe = () => void;

/**
 * A function that watches a store.
 * 
 * @param state - The state of the store.
 */
export type Watcher<T> = (state: T) => void;

/**
 * A store.
 * 
 * @param T - The type of the state.
 */
export interface Store<T> {
  /**
   * Gets the state of the store.
   * 
   * @returns The state of the store.
   */
  getState(): T;

  /**
   * Watches the store.
   * 
   * @param fn - The function to watch the store.
   * @returns A function that unsubscribes from the store.
   */
  watch(fn: Watcher<T>): Unsubscribe;

  /**
   * Maps the store.
   * 
   * @param fn - The function to map the store.
   * @returns The mapped store.
   */
  map<U>(fn: (state: T) => U): Store<U>;
}

/**
 * A writable store.
 * 
 * @param T - The type of the state.
 */
export type StoreWritable<T> = Store<T> & {
  /**
   * Sets the state of the store.
   * 
   * @param next - The next state.
   */
  setState(next: T): void;
};

/**
 * Creates a new store.
 * 
 * @param initial - The initial state.
 * @returns The store.
 */
export function createStore<T>(initial: T): StoreWritable<T> {
  let state = initial;
  const watchers = new Set<Watcher<T>>();

  const store: StoreWritable<T> = {
    getState(): T {
      return state;
    },
    watch(fn: Watcher<T>): Unsubscribe {
      watchers.add(fn);
      return () => {
        watchers.delete(fn);
      };
    },
    map<U>(fn: (state: T) => U): Store<U> {
      const mapped = createStore(fn(state));
      store.watch((next) => {
        mapped.setState(fn(next));
      });
      return mapped;
    },
    setState(next: T): void {
      if (next === state) return;
      state = next;
      watchers.forEach((fn) => fn(state));
    },
  };

  return store;
}

/**
 * Creates a new api for the store.
 * 
 * @param store - The store to create the api for.
 * @param shape - The shape of the api.
 * @returns The api.
 * @example
 * const store = createStore({ a: 1, b: 2 });
 * const api = createApi(store, {
 *   setA: (state, payload) => ({ ...state, a: payload }),
 *   setB: (state, payload) => ({ ...state, b: payload }),
 * });
 * api.setA(3);
 * store.getState(); // => { a: 3, b: 2 }
 */
export function createApi<
  T,
  E extends Record<string, (state: T, payload: any) => T>,
>(
  store: StoreWritable<T>,
  shape: E,
): { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void } {
  const api: Partial<{ [K in keyof E]: (payload: any) => void }> = {};

  forIn(shape, (reducer, key) => {
    api[key] = (payload: any) => {
      store.setState(reducer(store.getState(), payload));
    };
  });

  return api as { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
}

