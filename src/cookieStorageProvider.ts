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
  isDefined,
} from './is/isDefined';

export type TCookieWindowContext = {
  document: {
    cookie: string;
  };
};

/** The cookies — a key-value storage (`TKeyValueStorage`, fundamentool D-039). */
export type TCookieStorage = TKeyValueStorage;

/** How long a cookie lives, ms: 400 days — the longest the browsers keep one. */
const COOKIE_LIFETIME_MS = 400 * 86400000;

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
 * The document's cookies as a key-value storage: values are JSON, kept 400 days.
 *
 * @param ctx - The window whose `document.cookie` is used.
 * @returns `get`, `set`, `assign`, `remove`, `getKeys`, `clear`, and `watch` for every change.
 * @example
 * const storage = cookieStorageProvider(window);
 * storage.set('token', 'abc123');
 * storage.get('token'); // => 'abc123'
 * storage.remove('token');
 */
export const cookieStorageProvider = (ctx: TCookieWindowContext): TCookieStorage => {
  const doc = ctx.document;
  const cache = storageInit(doc.cookie);
  const changed = createEvent<TKeyValueChange>();

  function write(key: string, value: string): void {
    const date = new Date();
    date.setMilliseconds(date.getMilliseconds() + COOKIE_LIFETIME_MS);
    doc.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value) + '; expires=' + date.toUTCString();
  }

  changed.watch(({
    key, value,
  }) => {
    if (value === cache[key]) {
      return;
    }
    if (!isDefined(value)) {
      delete cache[key];
      write(key, '');
    } else {
      write(key, JSON.stringify((cache[key] = value)));
    }
  });

  const storage: TCookieStorage = {
    watch: changed.watch,
    get: (key) => cache[key],
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
    getKeys: () => Object.keys(cache),
    // Every key removed (it emitted each key's own value before — which the watcher skips: nothing was cleared)
    clear() {
      for (const key of Object.keys(cache)) {
        storage.set(key, null);
      }
      return storage;
    },
  };
  return storage;
};
