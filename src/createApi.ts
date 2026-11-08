import {
  createEvent,
  type TEvent,
} from './createEvent';
import type {
  ObservableWritable,
} from './createObservable';
import {
  forIn,
} from './forIn';

/**
 * Creates events that update a store through reducers (Effector's `createApi`): each is an event — callable, it
 * returns its payload; watchable, its watchers see the store already updated.
 *
 * @param observable - The store the events update.
 * @param shape - A reducer per event: the store's value and the payload → the next value.
 * @returns An event per reducer, under its key.
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
