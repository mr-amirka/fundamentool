import {
  createApi,
  createEvent,
  createObservable,
  isStore,
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

  test('watch — fires at once with the current value, then on every change (Effector\'s store.watch, D-049)', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(1);
    store.setState(2);
    expect(calls).toEqual([
      0,
      1,
      2,
    ]);
  });

  test('watch — the handle stops it, called or through its `unsubscribe` (Effector\'s Subscription)', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    const unsub = store.watch((v) => calls.push(v));
    store.setState(1);
    unsub();
    store.setState(2);
    const other = store.watch((v) => calls.push(v));
    other.unsubscribe();
    store.setState(3);
    expect(calls).toEqual([
      0,
      1,
      2,
    ]);
  });

  test('watch — a watcher added during a change gets the value once (at its subscription), not twice', () => {
    const store = createObservable(0);
    const late: number[] = [];
    store.watch((v) => {
      if (v === 1) {
        store.watch((w) => late.push(w));
      }
    });
    store.setState(1);
    expect(late).toEqual([1]);
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
    expect(a).toEqual([
      0,
      5,
      6,
    ]);
    expect(b).toEqual([
      0,
      5,
    ]);
  });

  test('setState — does not notify when state is same reference', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    store.watch((v) => calls.push(v));
    store.setState(0);
    expect(calls).toEqual([0]); // the call at subscription only
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
    const seen: number[] = [];
    x4.watch((v) => seen.push(v));
    store.setState(3);
    expect(x2.getState()).toBe(6);
    expect(x4.getState()).toBe(12);
    expect(seen).toEqual([
      4,
      12,
    ]);
  });

  test('map — notifies only when the derived value changes (Effector\'s map)', () => {
    const store = createObservable(1);
    const odd = store.map((v) => v % 2 === 1);
    const seen: boolean[] = [];
    odd.watch((v) => seen.push(v));
    store.setState(3);
    store.setState(4);
    expect(seen).toEqual([
      true,
      false,
    ]);
  });

  test('map — holds nothing while nobody watches it: one made and dropped leaks no watcher (D-049)', () => {
    const store = createObservable(1);
    let runs = 0;
    const doubled = store.map((v) => {
      runs++;
      return v * 2;
    });
    expect(runs).toBe(0); // nothing computed until read
    expect(doubled.getState()).toBe(2);
    expect(doubled.getState()).toBe(2);
    expect(runs).toBe(1); // read twice, the source unchanged: computed once
    store.setState(2);
    store.setState(3);
    expect(runs).toBe(1); // unwatched: the source's changes don't run it
    const stop = doubled.watch(() => undefined);
    expect(runs).toBe(2); // the first watcher: computed for the source's value now
    store.setState(4);
    expect(runs).toBe(3);
    stop();
    store.setState(5);
    store.setState(6);
    expect(runs).toBe(3); // the last watcher gone: the source isn't followed any more
    expect(doubled.getState()).toBe(12);
    stop(); // a second stop changes nothing
  });

  test('watch — a throwing watcher does not break other watchers or propagate to setState()', () => {
    const store = createObservable(0);
    const calls: number[] = [];
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    store.watch(() => {
      throw new Error('boom');
    }); // throws at once too: logged
    store.watch((v) => calls.push(v));
    expect(() => store.setState(1)).not.toThrow();
    expect(calls).toEqual([
      0,
      1,
    ]);
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});

describe('createEvent', () => {
  test('calling it hands the payload to its watchers and returns it; watch fires on calls only (D-049)', () => {
    const saved = createEvent<string>();
    const seen: string[] = [];
    const stop = saved.watch((id) => seen.push(id));
    expect(seen).toEqual([]); // nothing at subscription
    expect(saved('a')).toBe('a');
    stop.unsubscribe();
    saved('b');
    expect(seen).toEqual(['a']);
  });
});

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

    expect(calls).toEqual([
      'createObservable',
      'createApi',
    ]);
  });
});

describe('isStore', () => {
  it('a store has getState and watch — fundamentool\'s, a derived one, any alike (effector\'s); an event isn\'t one', () => {
    const $count = createObservable(0);
    expect(isStore($count)).toBe(true);
    expect(isStore($count.map((count) => count + 1))).toBe(true);
    expect(isStore({
      getState: () => 1,
      watch: () => () => undefined,
    })).toBe(true);
    expect(isStore(createEvent())).toBe(false);
    expect(isStore(null)).toBe(false);
    expect(isStore(true)).toBe(false);
    expect(isStore({
      getState: () => 1,
    })).toBe(false);
  });
});
