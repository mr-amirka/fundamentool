import {
  createStore as _createStore, createApi as _createApi, StoreWritable as Store, 
} from './Store';
import type {
  TStoreAdapter, 
} from './Store';

import {
  tryJsonParse, 
} from './tryJsonParse';
import {
  attachEvent, 
} from './attachEvent';

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

export type TLocalStorage = Store<any> & {
  /**
   * Sets a value in the local storage.
   * 
   * @param key - The key to set the value in.
   * @param value - The value to set.
   * @returns The local storage instance.
   */
  set: (key: string, value: any) => TLocalStorage;
  /**
   * Gets a value from the local storage.
   * 
   * @param key - The key to get the value from.
   * @returns The value.
   */
  get: (key: string) => any;
  /**
   * Removes a value from the local storage.
   * 
   * @param key - The key to remove the value from.
   * @returns The local storage instance.
   */
  remove: (key: string) => TLocalStorage;
  /**
   * Gets the keys from the local storage.
   * 
   * @returns The keys.
   */
  getKeys: () => string[];
  /**
   * Clears the local storage.
   * 
   * @returns The local storage instance.
   */
  clear: () => TLocalStorage;
};
export type TLocalStorageEvent = {
  /**
   * The key of the event.
   */
  key: string;
  /**
   * The value of the event.
   */
  value?: any;
};

/**
 * Creates a local storage provider.
 * 
 * @param win - The Window whose `localStorage` is managed.
 * @returns A reactive store with `get`, `set`, `remove`, `getKeys`, and `clear`.
 * @example
 * const storage = localStorageProvider(window);
 * storage.set('user', { name: 'Alice' });
 * storage.get('user'); // => { name: 'Alice' }
 * storage.remove('user');
 */
export const localStorageProvider = (win: TLocalStorageWindowContext,
  deps: Partial<TStoreAdapter> = {}): TLocalStorage => {
  const {
    createStore = _createStore, createApi = _createApi, 
  } = deps;
  let locked = false;
  const $instance = createStore<TLocalStorageEvent>({
    key: '', 
  });
  const {
    emit, 
  } = createApi($instance, {
    emit: (_: TLocalStorageEvent, payload: TLocalStorageEvent) => payload,
  });
  const originLocalStorage = win.localStorage;
  function __set(key: string, value: any) {
    emit({
      key,
      value, 
    });
    return $instance;
  }
  function getKeys() {
    const l = originLocalStorage.length;
    const keys: string[] = [];
    let i = 0;
    for (; i < l; i++) {
      keys.push(originLocalStorage.key(i) || '');
    }
    return keys;
  }
  attachEvent(
    win as any, 'storage', (event: any) => {
      locked = true;
      emit({
        key: event.key,
        value: tryJsonParse(event.newValue),
      });
      locked = false;
    },
  );
  $instance.watch(({
    key, value, 
  }: TLocalStorageEvent) => {
    if (locked) {
      return;
    }
    value === null || value === undefined
      ? originLocalStorage.removeItem(key)
      : originLocalStorage.setItem(key, JSON.stringify(value));
  });
  ($instance as any).set = __set;
  ($instance as any).get = (key: string) => tryJsonParse(originLocalStorage.getItem(key));
  ($instance as any).remove = (key: string) => __set(key, null);
  ($instance as any).getKeys = getKeys;
  ($instance as any).clear = () => {
    getKeys().forEach((key) => {
      emit({
        key,
        value: null, 
      });
    });
    return $instance;
  };
  return $instance as any;
};
