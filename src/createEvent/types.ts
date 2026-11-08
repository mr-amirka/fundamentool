// An event's types (fundamentool D-049: they keep to Effector's behaviour).
import type {
  Unsubscribe,
} from '../watchers';

/**
 * An event made from another — `map`, `filter` (Effector's derived event): it fires when its source does, and is
 * watched, never called. It follows its source only while something watches it, as a derived store does.
 *
 * @example
 * const edited = createEvent<string>();
 * const docs = edited.filter({ fn: (file) => file.endsWith('.md') }).map((file) => file.toUpperCase());
 * docs.watch((file) => console.log(file));
 * edited('a.ts'); edited('b.md'); // logs "B.MD"
 */
export type TEventDerived<T> = {
  /** Calls `fn` with each payload — on calls only, never at subscription. */
  watch(fn: (payload: T) => void): Unsubscribe;
  /** An event of `fn`'s result for each payload. */
  map<U>(fn: (payload: T) => U): TEventDerived<U>;
  /** An event of the payloads `fn` keeps; a type guard narrows its payload. */
  filter<S extends T>(config: { fn: (payload: T) => payload is S }): TEventDerived<S>;
  filter(config: { fn: (payload: T) => boolean }): TEventDerived<T>;
};

/**
 * An event — something that happens (Effector's `Event`): calling it hands the payload to its watchers and returns it;
 * `watch` fires on calls only, never at subscription.
 *
 * @example
 * const saved = createEvent<string>();
 * saved.watch((id) => toast(`saved ${id}`));
 * saved('note-7');
 */
export type TEvent<T> = ((payload: T) => T) & TEventDerived<T> & {
  /** An event that calls this one with `fn`'s result: a caller's own shape turned into this event's payload. */
  prepend<B>(fn: (payload: B) => T): TEvent<B>;
};
