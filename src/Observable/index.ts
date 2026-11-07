// The reactive core (fundamentool D-049): stores, derived stores, events — keeping to Effector's behaviour.
import {
  forIn,
} from '../forIn';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import type {
  Observable,
  ObservableWritable,
  TEvent,
  TEventDerived,
  TStore,
  Unsubscribe,
  Watcher,
} from './types';

/** A watch's handle: a function that is also `{ unsubscribe }` (Effector's `Subscription`). */
function subscription(stop: () => void): Unsubscribe {
  const handle = stop as Unsubscribe;
  handle.unsubscribe = stop;
  return handle;
}

/** Calls a watcher; one that throws neither stops the others nor reaches the caller — it is logged. */
function notify<T>(fn: Watcher<T>, value: T): void {
  try {
    fn(value);
  } catch (error) {
    console.error('Observable:watcher:error', error);
  }
}

/**
 * A derived store (`source.map(fn)`). It follows `source` only while it has watchers — subscribed by the first,
 * unsubscribed after the last — so one made and dropped (in a render) holds nothing; unwatched, it is computed when
 * read, once per value of `source`. It changes when `fn`'s result changes (`===`).
 */
function derive<T, U>(source: Observable<T>, fn: (state: T) => U): Observable<U> {
  const watchers = new Set<Watcher<U>>();
  let stop: Unsubscribe | null = null;
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
          // A copy: a watcher added during this change got the value at its subscription
          for (const each of Array.from(watchers)) {
            notify(each, value);
          }
        });
      }
      watchers.add(watcher);
      notify(watcher, value);
      return subscription(() => {
        if (watchers.delete(watcher) && !watchers.size && stop) {
          stop();
          stop = null;
        }
      });
    },
    map: (next) => derive(derived, next),
  };
  return derived;
}

/**
 * Creates a store. `watch` calls the watcher at once with the current value, then on every change (Effector's
 * `store.watch`); an equal value (`===`) is no change.
 *
 * @example
 * const $count = createObservable(0);
 * $count.watch((count) => console.log(count)); // logs 0
 * $count.setState(1); // logs 1
 */
export function createObservable<T>(initial: T): ObservableWritable<T> {
  let state = initial;
  const watchers = new Set<Watcher<T>>();

  const observable: ObservableWritable<T> = {
    getState: () => state,
    watch(fn) {
      watchers.add(fn);
      notify(fn, state);
      return subscription(() => {
        watchers.delete(fn);
      });
    },
    map: (fn) => derive(observable, fn),
    setState(next) {
      if (next === state) {
        return;
      }
      state = next;
      // A copy: a watcher added during this change got the value at its subscription
      for (const fn of Array.from(watchers)) {
        notify(fn, state);
      }
    },
  };

  return observable;
}

/** Gives an event `map` and `filter`, each an event derived from it. */
function withDerived<T, E extends Pick<TEventDerived<T>, 'watch'>>(event: E): E & TEventDerived<T> {
  const derivable = event as E & TEventDerived<T>;
  derivable.map = <U>(fn: (payload: T) => U) => deriveEvent<T, U>(event, (payload, fire) => {
    fire(fn(payload));
  });
  derivable.filter = ({
    fn,
  }: { fn: (payload: T) => boolean }) => deriveEvent<T, T>(event, (payload, fire) => {
    if (fn(payload)) {
      fire(payload);
    }
  });
  return derivable;
}

/**
 * An event derived from `source` (`map`, `filter`): `pass` turns each of its payloads into this one's, or none. It
 * watches `source` only while it has watchers — subscribed by the first, unsubscribed after the last — so one made and
 * dropped holds nothing.
 */
function deriveEvent<T, U>(source: Pick<TEventDerived<T>, 'watch'>, pass: (payload: T, fire: (payload: U) => void) => void): TEventDerived<U> {
  const watchers = new Set<(payload: U) => void>();
  let stop: Unsubscribe | null = null;
  const fire = (payload: U): void => {
    // A copy: a watcher added during this call hears the next one
    for (const fn of Array.from(watchers)) {
      notify(fn, payload);
    }
  };
  return withDerived<U, Pick<TEventDerived<U>, 'watch'>>({
    watch(fn) {
      if (!stop) {
        stop = source.watch((payload) => {
          pass(payload, fire);
        });
      }
      watchers.add(fn);
      return subscription(() => {
        if (watchers.delete(fn) && !watchers.size && stop) {
          stop();
          stop = null;
        }
      });
    },
  });
}

/**
 * Creates an event (Effector's `createEvent`): calling it hands the payload to its watchers and returns it; `watch`
 * fires on calls only — never at subscription. `map` and `filter` derive events from it, `prepend` an event that calls
 * it.
 *
 * @example
 * const saved = createEvent<string>();
 * saved.watch((id) => console.log('saved', id));
 * saved('note-7'); // logs "saved note-7"
 * const savedNote = saved.prepend((note: { id: string }) => note.id);
 * savedNote({ id: 'note-8' }); // logs "saved note-8"
 */
export function createEvent<T = void>(): TEvent<T> {
  const watchers = new Set<(payload: T) => void>();
  const event = ((payload: T): T => {
    for (const fn of Array.from(watchers)) {
      notify(fn, payload);
    }
    return payload;
  }) as TEvent<T>;
  event.watch = (fn) => {
    watchers.add(fn);
    return subscription(() => {
      watchers.delete(fn);
    });
  };
  event.prepend = <B>(fn: (payload: B) => T): TEvent<B> => {
    const before = createEvent<B>();
    before.watch((payload) => {
      event(fn(payload));
    });
    return before;
  };
  return withDerived<T, TEvent<T>>(event);
}

/**
 * Creates events that update a store through reducers (Effector's `createApi`): each is an event — callable, it
 * returns its payload; watchable, its watchers see the store already updated.
 *
 * @example
 * const $state = createObservable({ a: 1, b: 2 });
 * const api = createApi($state, {
 *   setA: (state, a: number) => ({ ...state, a }),
 * });
 * api.setA(3);
 * $state.getState(); // => { a: 3, b: 2 }
 */
export function createApi<
  T,
  E extends Record<string, (state: T, payload: any) => T>,
>(observable: ObservableWritable<T>,
  shape: E): { [K in keyof E]: TEvent<Parameters<E[K]>[1]> } {
  const api = {} as { [K in keyof E]: TEvent<Parameters<E[K]>[1]> };
  forIn(shape, (reducer, key) => {
    const event = createEvent<Parameters<E[typeof key]>[1]>();
    // The store's own watcher first: the event's other watchers see the new value
    event.watch((payload) => {
      observable.setState(reducer(observable.getState(), payload));
    });
    api[key as keyof E] = event;
  });
  return api;
}

/**
 * Whether `unit` is a store — `getState` + `watch` (fundamentool's or effector's); an event — a function without
 * `getState` — isn't one.
 *
 * @example
 * isStore(createObservable(0)); // => true
 * isStore(createEvent());       // => false
 */
export function isStore(unit: unknown): unit is TStore {
  return (isObject(unit) || isFunction(unit)) && isFunction((unit as TStore).getState) && isFunction((unit as TStore).watch);
}

export * from './types';
