// The interface of fundamentool's key-value storages (fundamentool D-039): `localStorageProvider`,
// `cookieStorageProvider` and a router's `params` — one shape, so any of them is `storeProvider`'s port.
import type {
  ObservableWritable,
} from './Observable/types';

/** A change of one key: its new value (`undefined` / `null` — removed). */
export type TKeyValueChange = {
  key: string;
  value?: any;
};

/**
 * A key-value storage: an observable of its changes (`{ key, value }`) with `get` / `set` / `assign` / `remove` /
 * `getKeys` / `clear`. `O` — the options a write takes (a router's `params`: `{ replace, quiet }`).
 */
export type TKeyValueStorage<O = never> = ObservableWritable<any> & {
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
