import { localStorageProvider } from '../src/localStorageProvider';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  const listeners: Array<(e: any) => void> = [];
  return {
    storage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    },
    win: {
      get localStorage() { return this._storage; },
      _storage: null as any,
      addEventListener: (_: string, cb: (e: any) => void) => listeners.push(cb),
      removeEventListener: jest.fn(),
    },
    store,
  };
}

describe('localStorageProvider', () => {
  test('set and get a value', () => {
    const { storage, win } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('name', 'Alice');
    expect(ls.get('name')).toBe('Alice');
  });

  test('remove a value', () => {
    const { storage, win } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('x', 42);
    ls.remove('x');
    expect(ls.get('x')).toBeNull();
  });

  test('getKeys returns all keys', () => {
    const { storage, win } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('a', 1);
    ls.set('b', 2);
    expect(ls.getKeys().sort()).toEqual(['a', 'b']);
  });

  test('clear removes all keys', () => {
    const { storage, win } = makeLocalStorageMock();
    win._storage = storage;
    const ls = localStorageProvider(win as any);
    ls.set('a', 1);
    ls.set('b', 2);
    ls.clear();
    expect(ls.getKeys()).toEqual([]);
  });
});
