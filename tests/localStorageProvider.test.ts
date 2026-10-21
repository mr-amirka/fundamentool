import {
  localStorageProvider,
} from '../src/localStorageProvider';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  const listeners: Array<(e: any) => void> = [];
  return {
    storage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    },
    win: {
      get localStorage() {
        return this._storage;
      },
      _storage: null as any,
      addEventListener: (_: string, cb: (e: any) => void) => listeners.push(cb),
      removeEventListener: jest.fn(),
    },
    store,
  };
}

describe('localStorageProvider', () => {
  test('set and get a value', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('name', 'Alice');
    expect(ls.get('name')).toBe('Alice');
  });

  test('assign writes several keys; undefined / null removes one', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('gone', 1);
    expect(ls.assign({
      a: 1,
      b: 'two',
      gone: undefined,
    })).toBe(ls);
    expect(ls.get('a')).toBe(1);
    expect(ls.get('b')).toBe('two');
    expect(ls.get('gone')).toBeNull();
  });

  test('remove a value', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('x', 42);
    ls.remove('x');
    expect(ls.get('x')).toBeNull();
  });

  test('getKeys returns all keys', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('a', 1);
    ls.set('b', 2);
    expect(ls.getKeys().sort()).toEqual([
      'a',
      'b',
    ]);
  });

  test('clear removes all keys', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('a', 1);
    ls.set('b', 2);
    ls.clear();
    expect(ls.getKeys()).toEqual([]);
  });

  test('getKeys — a key the storage can\'t name reads as an empty string', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = {
      ...storage,
      length: 1,
      key: () => null,
    };
    expect(localStorageProvider(win as any).getKeys()).toEqual(['']);
  });

  test('watch reports every change — this tab\'s and another tab\'s (the storage event) — never at subscription', () => {
    const {
      storage, win,
    } = makeLocalStorageMock();
    win._storage = storage;
    let fireStorage: (event: unknown) => void = () => undefined;
    (win as { addEventListener: unknown }).addEventListener = (_: string, cb: (event: unknown) => void) => {
      fireStorage = cb;
    };
    const ls = localStorageProvider(win as any);
    const changes: unknown[] = [];
    const stop = ls.watch((change) => changes.push(change));
    expect(changes).toEqual([]);
    ls.set('a', 1);
    // Another tab wrote `b`: reported, and not written back
    storage.setItem('b', JSON.stringify(2));
    const setItem = jest.spyOn(storage, 'setItem');
    fireStorage({
      key: 'b',
      newValue: JSON.stringify(2),
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(changes).toEqual([
      {
        key: 'a',
        value: 1,
      },
      {
        key: 'b',
        value: 2,
      },
    ]);
    stop.unsubscribe();
    ls.set('c', 3);
    expect(changes).toHaveLength(2);
  });
});
