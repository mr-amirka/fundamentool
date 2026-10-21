// The interface of fundamentool's key-value storages (fundamentool D-039, D-049): `localStorageProvider`,
// `cookieStorageProvider` and a router's `params` — one shape, so any of them is `storeProvider`'s port.
import type {
  Unsubscribe,
} from './Observable/types';

/** A change of one key: its new value (`undefined` / `null` — removed). */
export type TKeyValueChange = {
  key: string;
  value?: any;
};

/**
 * A key-value storage: its values (`get`, `getKeys`), its writes (`set`, `assign`, `remove`, `clear`) and the stream of
 * its changes. `O` — the options a write takes (a router's `params`: `{ replace, quiet }`).
 */
export type TKeyValueStorage<O = never> = {
  /**
   * Reports every change (`{ key, value }`) as it happens, whoever made it (another tab, the address bar) — a change is
   * an event: nothing at subscription (Effector's `event.watch`, D-049).
   */
  watch: (fn: (change: TKeyValueChange) => void) => Unsubscribe;
  /** Writes `value` under `key`. */
  set: (key: string, value: any, options?: O) => TKeyValueStorage<O>;
  /** Writes every key of `values` in one write (`undefined` / `null` — the key is removed). */
  assign: (values: Record<string, any>, options?: O) => TKeyValueStorage<O>;
  /** The value under `key`, or `undefined` / `null` when there is none. */
  get: (key: string) => any;
  /** Removes `key`. */
  remove: (key: string, options?: O) => TKeyValueStorage<O>;
  /** Every key there is. */
  getKeys: () => string[];
  /** Removes every key. */
  clear: (options?: O) => TKeyValueStorage<O>;
};
