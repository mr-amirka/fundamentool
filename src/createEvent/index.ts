// An event and the events derived from it (fundamentool D-049, D-105, D-112) — keeping to Effector's behaviour.
import {
  type Watcher,
  notifyAll,
  subscription,
  withWatcher,
  withoutWatcher,
} from '../watchers';
import type {
  TEvent,
  TEventDerived,
} from './types';

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
  let watchers: readonly Watcher<U>[] = [];
  let stop: (() => void) | null = null;
  const fire = (payload: U): void => {
    notifyAll(watchers, payload);
  };
  return withDerived<U, Pick<TEventDerived<U>, 'watch'>>({
    watch(fn) {
      if (!stop) {
        stop = source.watch((payload) => {
          pass(payload, fire);
        });
      }
      watchers = withWatcher(watchers, fn);
      return subscription(() => {
        const left = withoutWatcher(watchers, fn);
        if (left !== watchers) {
          watchers = left;
          if (!watchers.length && stop) {
            stop();
            stop = null;
          }
        }
      });
    },
  });
}

/**
 * Creates an event (Effector's `createEvent`): calling it hands the payload to its watchers and returns it; `watch`
 * fires on calls only — never at subscription. `map` and `filter` derive events from it, `prepend` an event that calls
 * it. A watcher added during a call hears the next one; a call copies nothing (the list is replaced on subscribing,
 * D-112).
 *
 * @returns The event: callable, `watch`, `map`, `filter`, `prepend`.
 * @example
 * const saved = createEvent<string>();
 * saved.watch((id) => console.log('saved', id));
 * saved('note-7'); // logs "saved note-7"
 * const savedNote = saved.prepend((note: { id: string }) => note.id);
 * savedNote({ id: 'note-8' }); // logs "saved note-8"
 */
export function createEvent<T = void>(): TEvent<T> {
  let watchers: readonly Watcher<T>[] = [];
  const event = ((payload: T): T => {
    notifyAll(watchers, payload);
    return payload;
  }) as TEvent<T>;
  event.watch = (fn) => {
    watchers = withWatcher(watchers, fn);
    return subscription(() => {
      watchers = withoutWatcher(watchers, fn);
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

export * from './types';
