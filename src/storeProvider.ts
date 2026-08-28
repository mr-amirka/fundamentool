import {
  isDefined, 
} from './is/isDefined';
import {
  isEqual, 
} from './is/isEqual';
import type {
  ObservableWritable,
} from './Observable/types';

/** Key-value persistence port (e.g. `localStorage`, a settings file) `storeProvider` reads/writes through. */
export type TStorage = {
  /** Subscribes to external changes (other tabs/processes writing the same key); returns an unsubscribe function. */
  watch: (fn: (e: Record<string, any>) => any) => () => void;
  /** Persists `value` under `key`. */
  set: (key: string, value: any) => any;
  /** Reads the persisted value for `key`, or `undefined`/`null` if absent. */
  get: (key: string) => any;
};

type TNormalize<A> = (prev: A | null) => A;

/** DI ports for the store implementation `storeProvider` is bound to (e.g. Effector's `createStore`/`createApi`). */
export type TStoreProviderDeps = {
  /** Creates a store instance seeded with `initial`. */
  createStore: <T>(initial: T) => any;
  /** Attaches event handlers (`shape`) to `store`, returning callable event triggers. */
  createApi: (store: any, shape: Record<string, (state: any, payload: any) => any>) => Record<string, (payload: any) => void>;
};

/**
 * Creates a factory for persisted, cross-tab-synced stores.
 *
 * Each store created by the returned factory loads its initial value from
 * `storage`, writes back on every `setState`, and re-syncs when `storage.watch`
 * reports an external change to the same key (e.g. another tab).
 *
 * @param deps - Store-library DI ports (`createStore`/`createApi`).
 * @param storage - Persistence port to read/write/watch values through.
 * @param originalPrefix - Optional prefix prepended to every store's name/key.
 * @returns A factory `(name, defaultValue?, isObjectExtension?) => ObservableWritable<A>`.
 * @example
 * const createPersistedStore = storeProvider({ createStore, createApi }, localStorageProvider(window));
 * const $theme = createPersistedStore('theme', 'light');
 * $theme.setState('dark'); // persisted to storage and re-emitted on external change
 */
export const storeProvider = (
  {
    createStore, createApi, 
  }: TStoreProviderDeps,
  storage: TStorage,
  originalPrefix?: string,
) => {
  const prefix = originalPrefix || '';

  return <A, B extends TNormalize<A> = TNormalize<A>>(
    originalName: string,
    defaultValue: A | null | TNormalize<A> = null,
    isObjectExtension?: boolean,
  ): ObservableWritable<A> => {
    const name = prefix + originalName;
    const defaultValueIsFunc = typeof defaultValue === 'function';
    const normalize: TNormalize<A> = isObjectExtension
      ? defaultValueIsFunc
        ? (v) => ({
          ...(defaultValue as B)(v),
          ...v, 
        } as A)
        : (v) => ({
          ...defaultValue,
          ...v, 
        } as A)
      : defaultValueIsFunc
        ? (defaultValue as B)
        : (v) => (isDefined(v) ? v as A : defaultValue as A);

    const $store = createStore<A>(normalize(storage.get(name)));
    const {
      emit, 
    } = createApi($store, {
      emit: (_: A, v: A) => v,
    });

    storage.watch((e) => {
      if (e.key === name) {
        emit(normalize(e.value));
      }
    });

    ($store as any).setState = (v: A) => {
      storage.set(name, isEqual(defaultValue, v) ? null : v);
      emit(normalize(v));
    };

    return $store as unknown as ObservableWritable<A>;
  };
};
