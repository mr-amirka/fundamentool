import {
  createObservable, createApi, 
} from '../src/Observable';
import type {
  TObservableAdapter, 
} from '../src/Observable';

describe('createObservable', () => {
  test('getState — returns initial value', () => {
    const store = createObservable(42);
    expect(store.getState()).toBe(42);
  });

  test('setState — updates state', () => {
    const store = createObservable(0);
    store.setState(99);
    expect(store.getState()).toBe(99);
  });

  test('watch — fires on state change', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(1);
    store.setState(2);
    expect(calls).toEqual([1, 2]);
  });

  test('watch — unsubscribe stops notifications', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    const unsub = store.watch((v) => calls.push(v));
    store.setState(1);
    unsub();
    store.setState(2);
    expect(calls).toEqual([1]);
  });

  test('watch — multiple independent watchers', () => {
    const store = createObservable(0);
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
    const store = createObservable(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(0);
    expect(calls).toEqual([]);
  });

  test('map — creates derived store with initial value', () => {
    const store = createObservable(2);
    const doubled = store.map((v) => v * 2);
    expect(doubled.getState()).toBe(4);
  });

  test('map — updates when source changes', () => {
    const store = createObservable(2);
    const doubled = store.map((v) => v * 2);
    store.setState(5);
    expect(doubled.getState()).toBe(10);
  });

  test('map — chained maps propagate correctly', () => {
    const store = createObservable(1);
    const x2 = store.map((v) => v * 2);
    const x4 = x2.map((v) => v * 2);
    store.setState(3);
    expect(x2.getState()).toBe(6);
    expect(x4.getState()).toBe(12);
  });

  test('watch — a throwing watcher does not break other watchers or propagate to setState()', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    store.watch(() => {
      throw new Error('boom');
    });
    store.watch((v) => calls.push(v));
    expect(() => store.setState(1)).not.toThrow();
    expect(calls).toEqual([1]);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe('createApi', () => {
  test('dispatches action to store', () => {
    const store = createObservable({
      count: 0, 
    });
    const api = createApi(store, {
      increment: (state, n: number) => ({
        ...state,
        count: state.count + n, 
      }),
      reset: (state) => ({
        ...state,
        count: 0, 
      }),
    });
    api.increment(3);
    expect(store.getState().count).toBe(3);
    api.reset(undefined);
    expect(store.getState().count).toBe(0);
  });

  test('multiple actions update store independently', () => {
    const store = createObservable({
      a: 0,
      b: 0, 
    });
    const api = createApi(store, {
      setA: (state, v: number) => ({
        ...state,
        a: v, 
      }),
      setB: (state, v: number) => ({
        ...state,
        b: v, 
      }),
    });
    api.setA(10);
    api.setB(20);
    expect(store.getState()).toEqual({
      a: 10,
      b: 20, 
    });
  });
});

describe('TObservableAdapter — DI', () => {
  test('custom adapter is called instead of built-in', () => {
    const calls: string[] = [];

    const adapter: TObservableAdapter = {
      createObservable: (initial) => {
        calls.push('createObservable');
        return createObservable(initial);
      },
      createApi: (store, shape) => {
        calls.push('createApi');
        return createApi(store, shape);
      },
    };

    const store = adapter.createObservable(0);
    adapter.createApi(store, {
      set: (_, v: number) => v, 
    });

    expect(calls).toEqual(['createObservable', 'createApi']);
  });
});
