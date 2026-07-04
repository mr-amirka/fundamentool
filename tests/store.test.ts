import { createStore, createApi } from '../src/Store';
import type { TStoreAdapter } from '../src/Store';

describe('createStore', () => {
  test('getState — returns initial value', () => {
    const store = createStore(42);
    expect(store.getState()).toBe(42);
  });

  test('setState — updates state', () => {
    const store = createStore(0);
    store.setState(99);
    expect(store.getState()).toBe(99);
  });

  test('watch — fires on state change', () => {
    const store = createStore(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(1);
    store.setState(2);
    expect(calls).toEqual([1, 2]);
  });

  test('watch — unsubscribe stops notifications', () => {
    const store = createStore(0);
    const calls: number[] = [];
    const unsub = store.watch((v) => calls.push(v));
    store.setState(1);
    unsub();
    store.setState(2);
    expect(calls).toEqual([1]);
  });

  test('watch — multiple independent watchers', () => {
    const store = createStore(0);
    const a: number[] = [];
    const b: number[] = [];
    store.watch((v) => a.push(v));
    const unsubB = store.watch((v) => b.push(v));
    store.setState(5);
    unsubB();
    store.setState(6);
    expect(a).toEqual([5, 6]);
    expect(b).toEqual([5]);
  });

  test('setState — does not notify when state is same reference', () => {
    const store = createStore(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(0);
    expect(calls).toEqual([]);
  });

  test('map — creates derived store with initial value', () => {
    const store = createStore(2);
    const doubled = store.map((v) => v * 2);
    expect(doubled.getState()).toBe(4);
  });

  test('map — updates when source changes', () => {
    const store = createStore(2);
    const doubled = store.map((v) => v * 2);
    store.setState(5);
    expect(doubled.getState()).toBe(10);
  });

  test('map — chained maps propagate correctly', () => {
    const store = createStore(1);
    const x2 = store.map((v) => v * 2);
    const x4 = x2.map((v) => v * 2);
    store.setState(3);
    expect(x2.getState()).toBe(6);
    expect(x4.getState()).toBe(12);
  });
});

describe('createApi', () => {
  test('dispatches action to store', () => {
    const store = createStore({ count: 0 });
    const api = createApi(store, {
      increment: (state, n: number) => ({ ...state, count: state.count + n }),
      reset: (state) => ({ ...state, count: 0 }),
    });
    api.increment(3);
    expect(store.getState().count).toBe(3);
    api.reset(undefined);
    expect(store.getState().count).toBe(0);
  });

  test('multiple actions update store independently', () => {
    const store = createStore({ a: 0, b: 0 });
    const api = createApi(store, {
      setA: (state, v: number) => ({ ...state, a: v }),
      setB: (state, v: number) => ({ ...state, b: v }),
    });
    api.setA(10);
    api.setB(20);
    expect(store.getState()).toEqual({ a: 10, b: 20 });
  });
});

describe('TStoreAdapter — DI', () => {
  test('custom adapter is called instead of built-in', () => {
    const calls: string[] = [];

    const adapter: TStoreAdapter = {
      createStore: (initial) => {
        calls.push('createStore');
        return createStore(initial);
      },
      createApi: (store, shape) => {
        calls.push('createApi');
        return createApi(store, shape);
      },
    };

    const store = adapter.createStore(0);
    adapter.createApi(store, { set: (_, v: number) => v });

    expect(calls).toEqual(['createStore', 'createApi']);
  });
});
