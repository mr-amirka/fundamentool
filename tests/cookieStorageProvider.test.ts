import {
  cookieStorageProvider, storageInit, 
} from '../src/cookieStorageProvider';
import {
  createObservable, createApi, 
} from '../src/Observable';

describe('storageInit', () => {
  test('parses cookie string into object', () => {
    expect(storageInit('a=1; b=2')).toEqual({
      a: 1,
      b: 2, 
    });
  });

  test('returns empty object for empty string', () => {
    expect(storageInit('')).toEqual({});
  });

  test('decodes URI-encoded keys and values', () => {
    const key = encodeURIComponent('my key');
    const val = encodeURIComponent(JSON.stringify('hello'));
    expect(storageInit(`${key}=${val}`)).toEqual({
      'my key': 'hello', 
    });
  });
});

describe('cookieStorageProvider', () => {
  function makeWindow() {
    const cookieStore: Record<string, string> = {};
    const doc = {
      get cookie() {
        return Object.entries(cookieStore)
          .map(([k, v]) => `${k}=${v}`)
          .join('; ');
      },
      set cookie(val: string) {
        const [pair] = val.split(';');
        const [k, v] = pair.split('=');
        if (v === '') {
          delete cookieStore[k];
        } else {
          cookieStore[k] = v;
        }
      },
    };
    return {
      document: doc, 
    } as any;
  }

  test('set and get a value', () => {
    const win = makeWindow();
    const storage = cookieStorageProvider(win);
    storage.set('token', 'abc');
    expect(storage.get('token')).toBe('abc');
  });

  test('remove a value', () => {
    const win = makeWindow();
    const storage = cookieStorageProvider(win);
    storage.set('x', 'val');
    storage.remove('x');
    expect(storage.get('x')).toBeUndefined();
  });

  test('getKeys returns stored keys', () => {
    const win = makeWindow();
    const storage = cookieStorageProvider(win);
    storage.set('a', 1);
    storage.set('b', 2);
    expect(storage.getKeys().sort()).toEqual(['a', 'b']);
  });

  test('deps — custom createObservable is called', () => {
    const win = makeWindow();
    let called = false;
    cookieStorageProvider(win, {
      createObservable: (initial) => {
        called = true; return createObservable(initial); 
      },
      createApi,
    });
    expect(called).toBe(true);
  });

  test('deps — default store works when no deps provided', () => {
    const win = makeWindow();
    const storage = cookieStorageProvider(win);
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });
});
