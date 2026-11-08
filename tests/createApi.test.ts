import {
  createApi,
} from '../src/createApi';
import {
  createObservable,
} from '../src/createObservable';

describe('createApi', () => {
  test('its members are events: callable (they return the payload), watchable — the store already updated', () => {
    const store = createObservable(0);
    const api = createApi(store, {
      add: (state, n: number) => state + n,
    });
    const seen: number[] = [];
    api.add.watch((n) => seen.push(store.getState() * 10 + n));
    expect(api.add(2)).toBe(2);
    expect(seen).toEqual([22]);
  });

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
