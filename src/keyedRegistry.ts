/** Sets of items by key — see {@link keyedRegistry}. */
export type TKeyedRegistry<K, T> = {
  /** Adds an item under a key; returns its removal (calling it twice is harmless). */
  add: (key: K, item: T) => () => void;
  /** The key's items now, in the order they were added (a copy: safe to change the registry while iterating). */
  list: (key: K) => T[];
  /** Does the key have any items? */
  has: (key: K) => boolean;
  /** Drops the key with all its items (e.g. the thing the key stands for is gone). */
  forget: (key: K) => void;
};

/**
 * Sets of items by key: subscriptions per entity — a level, a unit, a chat channel, a request id. Each `add` returns
 * its own removal, so an owner removes exactly what it added; `forget` drops a whole key at once.
 *
 * @returns An empty registry.
 * @example
 * const listeners = keyedRegistry<number, () => void>();
 * const off = listeners.add(levelId, onChange);   // subscribe; off() unsubscribes
 * listeners.list(levelId).forEach((fn) => fn());  // notify the key's subscribers
 * listeners.forget(levelId);                      // the level is gone: drop all its subscriptions
 */
export function keyedRegistry<K, T>(): TKeyedRegistry<K, T> {
  const map = new Map<K, Set<T>>();
  return {
    add: (key, item) => {
      const set = map.get(key) ?? new Set<T>();
      map.set(key, set.add(item));
      return () => {
        set.delete(item);
      };
    },
    list: (key) => [...(map.get(key) ?? [])],
    has: (key) => (map.get(key)?.size ?? 0) > 0,
    forget: (key) => {
      map.delete(key);
    },
  };
}
