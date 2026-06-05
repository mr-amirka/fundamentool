import { createStore, createApi } from '../src/store';

describe('createStore', () => {
  test('getState returns initial value', () => {
    const store = createStore(42);
    expect(store.getState()).toBe(42);
  });

  test('setState updates state', () => {
    const store = createStore(0);
    store.setState(99);
    expect(store.getState()).toBe(99);
  });

  test('watch fires on state change', () => {
    const store = createStore(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(1);
    store.setState(2);
    expect(calls).toEqual([1, 2]);
  });

  test('watch unsubscribe stops notifications', () => {
    const store = createStore(0);
    const calls: number[] = [];
    const unsub = store.watch((v) => calls.push(v));
    store.setState(1);
    unsub();
    store.setState(2);
    expect(calls).toEqual([1]);
  });

  test('does not notify when state is same reference', () => {
    const store = createStore(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(0);
    expect(calls).toEqual([]);
  });

  test('map creates derived store', () => {
    const store = createStore(2);
    const doubled = store.map((v) => v * 2);
    expect(doubled.getState()).toBe(4);
    store.setState(5);
    expect(doubled.getState()).toBe(10);
  });
});

describe('createApi', () => {
  test('dispatches actions to store', () => {
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
});
