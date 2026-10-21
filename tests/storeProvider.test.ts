/**
 * `storeProvider` — stores kept in a storage (`localStorage`, cookies, the address's query): the value read on creation,
 * written on `setState`, followed when the storage reports a change. Typed by the injected library's kind of store.
 */
import {
  createApi,
  createObservable,
} from '../src/Observable';
import {
  storeProvider,
} from '../src/storeProvider';
import type {
  TObservableStores,
  TPersistedStore,
  TStorage,
  TStoreKind,
} from '../src/storeProvider';

/** A storage in memory; `change` — another tab writing a key. */
function memoryStorage(initial: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    ...initial,
  };
  const watchers = new Set<(e: Record<string, unknown>) => void>();
  const storage: TStorage = {
    get: (key) => values[key],
    set: (key, value) => {
      values[key] = value;
    },
    watch: (fn) => {
      watchers.add(fn);
      return () => watchers.delete(fn);
    },
  };
  return {
    storage,
    values,
    change: (key: string, value: unknown) => {
      values[key] = value;
      watchers.forEach((fn) => fn({
        key,
        value,
      }));
    },
  };
}

/** A store of an effector-like library: no `setState` — its events change it. */
type TLibStore<T> = {
  getState(): T;
  watch(fn: (value: T) => void): () => void;
  kind: 'lib';
};

/** That library's kind of store, as an app declares it. */
interface TLibStores extends TStoreKind {
  store: TLibStore<this['value']>;
}

/** The library: stores and events (`createApi`), as effector's. */
const LIB = {
  createStore: <T>(initial: T): TLibStore<T> => {
    let value = initial;
    const watchers = new Set<(next: T) => void>();
    const store = {
      getState: () => value,
      watch: (fn: (next: T) => void) => {
        watchers.add(fn);
        fn(value);
        return () => watchers.delete(fn);
      },
      kind: 'lib' as const,
      put: (next: T) => {
        value = next;
        watchers.forEach((fn) => fn(next));
      },
    };
    return store;
  },
  createApi: (store: { put: (value: unknown) => void;
    getState: () => unknown }, shape: Record<string, (state: unknown, payload: unknown) => unknown>) => {
    const api: Record<string, (payload: unknown) => void> = {};
    for (const key of Object.keys(shape)) {
      api[key] = (payload) => store.put(shape[key](store.getState(), payload));
    }
    return api;
  },
};

describe('storeProvider', () => {
  it('reads the stored value, falls back to the default, writes on setState (the default as null), follows other tabs', () => {
    const memory = memoryStorage({
      theme: 'dark',
    });
    const localStore = storeProvider({
      createStore: createObservable,
      createApi,
    }, memory.storage);
    const $theme = localStore('theme', 'light');
    const $size = localStore('size', 14);
    expect($theme.getState()).toBe('dark');
    expect($size.getState()).toBe(14);
    $theme.setState('light');
    expect(memory.values.theme).toBeNull(); // the default isn't stored
    expect($theme.getState()).toBe('light');
    $size.setState(16);
    expect(memory.values.size).toBe(16);
    memory.change('size', 18); // another tab
    expect($size.getState()).toBe(18);
    memory.change('other', 1);
    expect($size.getState()).toBe(18);
  });

  it('a prefix for every key; an object default extended by the stored value; a default that normalizes', () => {
    const memory = memoryStorage({
      'app.view': {
        zoom: 2,
      },
      'app.count': '7',
    });
    const store = storeProvider(
      {
        createStore: createObservable,
        createApi,
      }, memory.storage, 'app.',
    );
    const $view = store(
      'view', {
        zoom: 1,
        grid: true,
      }, true,
    );
    expect($view.getState()).toEqual({
      zoom: 2,
      grid: true,
    });
    const $extended = store(
      'view', (value: { zoom: number } | null) => ({
        zoom: 1,
        ...value,
        grid: false,
      }), true,
    );
    expect($extended.getState()).toEqual({
      zoom: 2,
      grid: false,
    });
    const $count = store('count', (value: unknown) => Number(value ?? 0));
    expect($count.getState()).toBe(7);
    const $none = store('none');
    expect($none.getState()).toBeNull();
  });

  it('over another library\'s stores: typed as that library\'s, setState shown through its events', () => {
    const memory = memoryStorage({
      n: 'Mars',
    });
    const hashParamStore = storeProvider<TLibStores>(LIB as never, memory.storage);
    const $name = hashParamStore('n', '');
    // The library's store type with `setState` — no cast at the call site
    const typed: TLibStore<string> & { setState(value: string): void } = $name;
    expect(typed.kind).toBe('lib');
    const seen: string[] = [];
    $name.watch((value) => seen.push(value));
    $name.setState('Venus');
    memory.change('n', 'Earth');
    expect(seen).toEqual([
      'Mars',
      'Venus',
      'Earth',
    ]);
    expect(memory.values.n).toBe('Earth');
  });

  it('the default kind is fundamentool\'s own store', () => {
    const $flag: TPersistedStore<TObservableStores, boolean> = storeProvider({
      createStore: createObservable,
      createApi,
    }, memoryStorage().storage)('flag', false);
    expect($flag.map((flag) => !flag).getState()).toBe(true); // an ObservableWritable: it has `map`
  });
});
