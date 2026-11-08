// A store and the stores derived from it (fundamentool D-049, D-112) — keeping to Effector's behaviour.
import {
  type Watcher,
  notify,
  notifyAll,
  subscription,
  withWatcher,
  withoutWatcher,
} from '../watchers';
import type {
  Observable,
  ObservableWritable,
} from './types';

/**
 * A derived store (`source.map(fn)`). It follows `source` only while it has watchers — subscribed by the first,
 * unsubscribed after the last — so one made and dropped (in a render) holds nothing; unwatched, it is computed when
 * read, once per value of `source`. It changes when `fn`'s result changes (`===`).
 */
function derive<T, U>(source: Observable<T>, fn: (state: T) => U): Observable<U> {
  let watchers: readonly Watcher<U>[] = [];
  let stop: (() => void) | null = null;
  let computed = false;
  let from: T;
  let value: U;

  function read(): U {
    const now = source.getState();
    if (!computed || now !== from) {
      from = now;
      value = fn(now);
      computed = true;
    }
    return value;
  }

  const derived: Observable<U> = {
    getState: () => (stop ? value : read()),
    watch(watcher) {
      if (!stop) {
        read();
        stop = source.watch((next) => {
          // The source's call at subscription, or a value already taken
          if (next === from) {
            return;
          }
          from = next;
          const nextValue = fn(next);
          if (nextValue === value) {
            return;
          }
          value = nextValue;
          notifyAll(watchers, value);
        });
      }
      watchers = withWatcher(watchers, watcher);
      notify(watcher, value);
      return subscription(() => {
        const left = withoutWatcher(watchers, watcher);
        if (left !== watchers) {
          watchers = left;
          if (!watchers.length && stop) {
            stop();
            stop = null;
          }
        }
      });
    },
    map: (next) => derive(derived, next),
  };
  return derived;
}

/**
 * Creates a store. `watch` calls the watcher at once with the current value, then on every change (Effector's
 * `store.watch`); an equal value (`===`) is no change. A watcher added during a change got the value at its
 * subscription; a change copies nothing (the list is replaced on subscribing, D-112).
 *
 * @param initial - The value it starts with.
 * @returns The store: `getState`, `watch`, `map`, `setState`.
 * @example
 * const $count = createObservable(0);
 * $count.watch((count) => console.log(count)); // logs 0
 * $count.setState(1); // logs 1
 */
export function createObservable<T>(initial: T): ObservableWritable<T> {
  let state = initial;
  let watchers: readonly Watcher<T>[] = [];

  const observable: ObservableWritable<T> = {
    getState: () => state,
    watch(fn) {
      watchers = withWatcher(watchers, fn);
      notify(fn, state);
      return subscription(() => {
        watchers = withoutWatcher(watchers, fn);
      });
    },
    map: (fn) => derive(observable, fn),
    setState(next) {
      if (next === state) {
        return;
      }
      state = next;
      notifyAll(watchers, state);
    },
  };

  return observable;
}

export * from './types';
