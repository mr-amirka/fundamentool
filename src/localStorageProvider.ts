import {
  createEvent,
} from './Observable';

import type {
  TKeyValueChange,
  TKeyValueStorage,
} from './keyValueStorage';
import {
  tryJsonParse,
} from './tryJsonParse';
import {
  attachEvent,
} from './attachEvent';
import {
  isDefined,
} from './is/isDefined';

export type TLocalStorageWindowContext = {
  localStorage: {
    length: number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  addEventListener(type: string, listener: (event: any) => void, options?: any): void;
  removeEventListener(type: string, listener: (event: any) => void, options?: any): void;
};

/** The local storage — a key-value storage (`TKeyValueStorage`, fundamentool D-039). */
export type TLocalStorage = TKeyValueStorage;

/**
 * The window's `localStorage` as a key-value storage: values are JSON; a change another tab makes is reported too
 * (the `storage` event).
 *
 * @param win - The window whose `localStorage` is used.
 * @returns `get`, `set`, `assign`, `remove`, `getKeys`, `clear`, and `watch` for every change.
 * @example
 * const storage = localStorageProvider(window);
 * storage.watch(({ key, value }) => console.log(key, value)); // this tab's changes and other tabs'
 * storage.set('user', { name: 'Alice' });
 * storage.get('user'); // => { name: 'Alice' }
 */
export const localStorageProvider = (win: TLocalStorageWindowContext): TLocalStorage => {
  const native = win.localStorage;
  const changed = createEvent<TKeyValueChange>();
  /** The change being reported came from another tab — it is in the storage already. */
  let external = false;

  changed.watch(({
    key, value,
  }) => {
    if (external) {
      return;
    }
    !isDefined(value)
      ? native.removeItem(key)
      : native.setItem(key, JSON.stringify(value));
  });
  attachEvent(
    win as any, 'storage', (event: any) => {
      external = true;
      changed({
        key: event.key,
        value: tryJsonParse(event.newValue),
      });
      external = false;
    },
  );

  function getKeys(): string[] {
    const length = native.length;
    const keys: string[] = [];
    for (let i = 0; i < length; i++) {
      keys.push(native.key(i) || '');
    }
    return keys;
  }

  const storage: TLocalStorage = {
    watch: changed.watch,
    get: (key) => tryJsonParse(native.getItem(key)),
    set(key, value) {
      changed({
        key,
        value,
      });
      return storage;
    },
    assign(values) {
      for (const key of Object.keys(values)) {
        storage.set(key, values[key]);
      }
      return storage;
    },
    remove: (key) => storage.set(key, null),
    getKeys,
    clear() {
      for (const key of getKeys()) {
        storage.set(key, null);
      }
      return storage;
    },
  };
  return storage;
};
