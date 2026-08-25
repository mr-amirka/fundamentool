import {
  createStore as _createStore, createApi as _createApi, StoreWritable, 
} from './Store';
import type {
  TStoreAdapter, 
} from './Store';
import {
  tryJsonParse, 
} from './tryJsonParse';

export type TCookieWindowContext = {
  document: {
    cookie: string;
  };
};

export type TCookieStorage = StoreWritable<any> & {
  set: (key: string, value: any) => TCookieStorage;
  get: (key: string) => any;
  remove: (key: string) => TCookieStorage;
  getKeys: () => string[];
  clear: () => TCookieStorage;
};

const expires = 400 * 86400000;

/**
 * Initializes the storage.
 * 
 * @param cookie - The cookie to initialize the storage with.
 * @returns The initialized storage.
 */
export const storageInit = (cookie: string): any => {
  const w = cookie ? cookie.split('; ') : [];
  const l = w.length;
  const output: any = {};
  let i = 0;
  let parts: string[];
  let k: string;
  for (; i < l; i++) {
    k = decodeURIComponent((parts = w[i].split('='))[0]);
    output[k] = tryJsonParse(decodeURIComponent(parts[1]));
  }
  return output;
};

/**
 * Creates a cookie storage provider.
 * 
 * @param ctx - The Window whose `document.cookie` is managed.
 * @returns A reactive cookie storage with `get`, `set`, `remove`, `getKeys`, and `clear`.
 * @example
 * const storage = cookieStorageProvider(window);
 * storage.set('token', 'abc123');
 * storage.get('token'); // => 'abc123'
 * storage.remove('token');
 */
export const cookieStorageProvider = (ctx: TCookieWindowContext,
  deps: Partial<TStoreAdapter> = {}): TCookieStorage => {
  const {
    createStore = _createStore, createApi = _createApi, 
  } = deps;
  const $instance = createStore<any>({} as any);
  const {
    emit, 
  } = createApi($instance, {
    emit: (_: any, payload: any) => payload,
  });

  const doc = ctx.document;
  const cache = storageInit(doc.cookie);
  function __set(key: string, value: string) {
    const date = new Date();
    date.setMilliseconds(date.getMilliseconds() + expires);
    doc.cookie =
      encodeURIComponent(key) + '=' + encodeURIComponent(value) + '; expires=' + date.toUTCString();
  }
  function set(key: string, value: any) {
    emit({
      key,
      value, 
    } as any);
    return $instance;
  }
  $instance.watch(({
    key, value, 
  }: { key: string;
    value: any }) => {
    if (value === cache[key]) {
      return;
    }
    if (value === null || value === undefined) {
      delete cache[key];
      __set(key, '');
    } else {
      __set(key, JSON.stringify((cache[key] = value)));
    }
  });
  ($instance as any).set = set;
  ($instance as any).get = (key: string) => cache[key];
  ($instance as any).remove = (key: string) => set(key, null);
  ($instance as any).getKeys = () => Object.keys(cache);
  ($instance as any).clear = () => {
    let key;
    for (key in cache) emit({ // eslint-disable-line
      key,
      value: cache[key],
    } as any);
    return $instance;
  };
  return $instance as any;
};
