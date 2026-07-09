import {
  forIn, 
} from '../forIn';
import type {
  Unsubscribe, Watcher, Store, StoreWritable, 
} from './types';

/**
 * Creates a new store.
 *
 * @example
 * const store = createStore(0);
 * store.watch((v) => console.log(v));
 * store.setState(1); // => logs 1
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
      if (next === state) {
        return;
      }
      state = next;
      watchers.forEach((fn) => fn(state));
    },
  };

  return store;
}

/**
 * Creates action handlers that update a store via reducers.
 *
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
>(store: StoreWritable<T>,
  shape: E): { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void } {
  const api: Partial<{ [K in keyof E]: (payload: any) => void }> = {};

  forIn(shape, (reducer, key) => {
    api[key] = (payload: any) => {
      store.setState(reducer(store.getState(), payload));
    };
  });

  return api as { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
}

export * from './types';
