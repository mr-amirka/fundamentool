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

/**
 * A store library's stores as a type of their value — how `storeProvider` knows what it returns (TypeScript has no
 * "a store type for any value" parameter, so a kind names it through `this['value']`). Declare one for the library an
 * app injects; fundamentool's own stores are the default.
 *
 * @example
 * import type { Store } from 'effector';
 * interface TEffectorStores extends TStoreKind { store: Store<this['value']> }
 * const localStore = storeProvider<TEffectorStores>({ createStore, createApi }, localStorageProvider(window));
 * const $theme = localStore('theme', 'light'); // Store<string> & { setState(value: string): void } — no cast
 */
export interface TStoreKind {
  /** The value a store holds — filled in by `TStoreOf`. */
  value: unknown;
  /** The store for that value. */
  store: unknown;
}

/** fundamentool's own stores (`createObservable`) — `storeProvider`'s default kind. */
export interface TObservableStores extends TStoreKind {
  store: ObservableWritable<this['value']>;
}

/** The store of kind `K` for values `A`. */
export type TStoreOf<K extends TStoreKind, A> = (K & { value: A })['store'];

/** What `storeProvider` makes: the library's store, plus a `setState` that writes to the storage and shows the value. */
export type TPersistedStore<K extends TStoreKind, A> = TStoreOf<K, A> & {
  setState(value: A): void;
};

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
 * @typeParam K - The injected library's kind of store (`TStoreKind`) — what the stores are typed as; default
 *   fundamentool's own.
 * @param deps - Store-library DI ports (`createStore`/`createApi`).
 * @param storage - Persistence port to read/write/watch values through.
 * @param originalPrefix - Optional prefix prepended to every store's name/key.
 * @returns A factory `(name, defaultValue?, isObjectExtension?) => TPersistedStore<K, A>`.
 * @example
 * const createPersistedStore = storeProvider({ createStore, createApi }, localStorageProvider(window));
 * const $theme = createPersistedStore('theme', 'light');
 * $theme.setState('dark'); // persisted to storage and re-emitted on external change
 */
export const storeProvider = <K extends TStoreKind = TObservableStores>(
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
  ): TPersistedStore<K, A> => {
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
    // fundamentool's observables emit through `setState`, which is replaced below: they show a value through their own
    // (an effector store has none — its event shows it).
    const ownSetState = ($store as any).setState as ((v: A) => void) | undefined;
    const show: (v: A) => void = ownSetState ? (v) => ownSetState.call($store, v) : emit;

    storage.watch((e) => {
      if (e.key === name) {
        show(normalize(e.value));
      }
    });

    ($store as any).setState = (v: A) => {
      storage.set(name, isEqual(defaultValue, v) ? null : v);
      show(normalize(v));
    };

    return $store as TPersistedStore<K, A>;
  };
};
