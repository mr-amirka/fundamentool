import {
  forIn,
} from '../forIn';
import type {
  Unsubscribe,
  Watcher,
  Observable,
  ObservableWritable,
} from './types';

/**
 * Creates a new observable.
 *
 * @example
 * const observable = createObservable(0);
 * observable.watch((v) => console.log(v));
 * observable.setState(1); // => logs 1
 */
export function createObservable<T>(initial: T): ObservableWritable<T> {
  let state = initial;
  const watchers = new Set<Watcher<T>>();

  const observable: ObservableWritable<T> = {
    getState(): T {
      return state;
    },
    watch(fn: Watcher<T>): Unsubscribe {
      watchers.add(fn);
      return () => {
        watchers.delete(fn);
      };
    },
    map<U>(fn: (state: T) => U): Observable<U> {
      const mapped = createObservable(fn(state));
      observable.watch((next) => {
        mapped.setState(fn(next));
      });
      return mapped;
    },
    setState(next: T): void {
      if (next === state) {
        return;
      }
      state = next;
      // Set — each()/eachTry() умеют только массивы и plain-объекты, поэтому
      // изоляция ошибок воспроизведена вручную (тот же паттерн, что и
      // EventEmitter.emit()) — один упавший watcher не должен обрывать обход
      // остальных и не должен пробрасываться наружу из setState().
      watchers.forEach((fn) => {
        try {
          fn(state);
        } catch (error) {
          console.error('Observable:watcher:error', error);
        }
      });
    },
  };

  return observable;
}

/**
 * Creates action handlers that update an observable via reducers.
 *
 * @example
 * const observable = createObservable({ a: 1, b: 2 });
 * const api = createApi(observable, {
 *   setA: (state, payload) => ({ ...state, a: payload }),
 *   setB: (state, payload) => ({ ...state, b: payload }),
 * });
 * api.setA(3);
 * observable.getState(); // => { a: 3, b: 2 }
 */
export function createApi<
  T,
  E extends Record<string, (state: T, payload: any) => T>,
>(observable: ObservableWritable<T>,
  shape: E): { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void } {
  const api: Partial<{ [K in keyof E]: (payload: any) => void }> = {};

  forIn(shape, (reducer, key) => {
    api[key] = (payload: any) => {
      observable.setState(reducer(observable.getState(), payload));
    };
  });

  return api as { [K in keyof E]: (payload: Parameters<E[K]>[1]) => void };
}

export * from './types';
