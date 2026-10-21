// The hooks that read stores in components (fundamentool D-048, D-049) — effector-react's `useUnit` and `useStoreMap`,
// the same names and shapes, over any store with `getState` + `watch` (fundamentool's, effector's), built on the view
// library's `useSyncExternalStore`.
import {
  isArray,
} from '../is/isArray';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import type {
  Observable,
} from '../Observable/types';
import {
  assertViewLibrary,
} from './library';
import type {
  TViewLibrary,
} from './library';

const WHERE = '[fundamentool] viewHooksProvider';

/** A store: `getState` + `watch` (an event — a function without `getState` — isn't one). */
type TStore<T = unknown> = Pick<Observable<T>, 'getState' | 'watch'>;

/** What `useUnit` takes: a store, an event (any function), or a list / a shape of them. */
type TUnitShape = TStore | ((...args: any[]) => any) | readonly unknown[] | Record<string, unknown>;

/** A store's value; anything else as it is. */
type TValueOf<U> = U extends TStore<infer T> ? T : U;

/** What `useUnit` returns for a shape: values for stores, the rest as it is. */
export type TUnitValues<S> = S extends TStore<infer T>
  ? T
  : S extends (...args: any[]) => any
    ? S
    : { [K in keyof S]: TValueOf<S[K]> };

/** `useStoreMap`'s full form. */
export type TStoreMapConfig<S, R, K extends readonly unknown[]> = {
  store: TStore<S>;
  /** What `fn` depends on besides the state (a prop, a page's id): a change of them computes it again. */
  keys: K;
  fn: (state: S, keys: K) => R;
  /** `true` — show `update` instead of `current` (default: when they differ by `!==`). */
  updateFilter?: (update: R, current: R) => boolean;
  /** What to show when `fn` returns `undefined`. */
  defaultValue?: R;
};

/** No keys, shared. */
const NO_KEYS: readonly unknown[] = [];

function isStore(unit: unknown): unit is TStore {
  return (isObject(unit) || isFunction(unit)) && isFunction((unit as TStore).getState) && isFunction((unit as TStore).watch);
}

/** Whether two lists hold the same items, in order (`===`). */
function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
  const length = a.length;
  if (length !== b.length) {
    return false;
  }
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/** One `subscribe` per store, the same at every render — `useSyncExternalStore` re-subscribes when it changes. */
const subscribers = new WeakMap<TStore, (onChange: () => void) => () => void>();

function subscribeTo(store: TStore): (onChange: () => void) => () => void {
  let subscribe = subscribers.get(store);
  if (!subscribe) {
    subscribe = (onChange) => store.watch(() => onChange());
    subscribers.set(store, subscribe);
  }
  return subscribe;
}

/**
 * The hooks over a React-like view library (React, Preact `compat`; later fundamentool's own): `useUnit` and
 * `useStoreMap` — effector-react's names and shapes, for fundamentool's stores and effector's alike (D-048).
 *
 * @example
 * const { useUnit, useStoreMap } = viewHooksProvider({ useSyncExternalStore, useRef }); // once, in the app's deps
 *
 * const path = useUnit(router.$path);                                  // a value; re-renders when it changes
 * const { coins, spend } = useUnit({ coins: $coins, spend: spendCoins }); // an event comes back as it is
 * const section = useStoreMap(nav.$state, (state) => state.section);   // only when the section changes
 */
export function viewHooksProvider(library: Pick<TViewLibrary, 'useSyncExternalStore' | 'useRef'> & Partial<TViewLibrary>) {
  assertViewLibrary(
    WHERE, library, [
      'useSyncExternalStore',
      'useRef',
    ],
  );
  const {
    useSyncExternalStore,
    useRef,
  } = library;

  /**
   * The values of stores, re-rendering when one of them changes (`!==`): a store → its value; an event (a function) →
   * itself; a list or a shape of them → the same list / shape of values. The list's length and the shape's keys stay
   * the same from render to render (as effector's).
   *
   * @example
   * const level = useUnit($level);
   * const [level, moves] = useUnit([$level, $moves]);
   * const { level, restart } = useUnit({ level: $level, restart: restartLevel });
   */
  function useUnit<S extends TUnitShape>(shape: S): TUnitValues<S> {
    const single = isStore(shape) || isFunction(shape);
    const keys = single || isArray(shape) ? null : Object.keys(shape);
    const units: readonly unknown[] = single
      ? [shape]
      : keys
        ? keys.map((key) => (shape as Record<string, unknown>)[key])
        : shape as readonly unknown[];
    // The same hooks whatever the shape: the component's hooks keep their order
    const subscription = useRef(null) as { current: { units: readonly unknown[];
      subscribe: (onChange: () => void) => () => void; } | null; };
    const snapshot = useRef(null) as { current: { values: unknown[];
      result: unknown; } | null; };
    if (!subscription.current || !sameList(subscription.current.units, units)) {
      subscription.current = {
        units,
        subscribe: (onChange) => {
          const stops = units.filter(isStore).map((store) => store.watch(() => onChange()));
          return () => stops.forEach((stop) => stop());
        },
      };
    }
    return useSyncExternalStore(subscription.current.subscribe, () => {
      const values = units.map((unit) => (isStore(unit) ? unit.getState() : unit));
      const last = snapshot.current;
      if (last && sameList(last.values, values)) {
        return last.result;
      }
      let result: unknown = values;
      if (single) {
        result = values[0];
      } else if (keys) {
        const object: Record<string, unknown> = {};
        keys.forEach((key, i) => {
          object[key] = values[i];
        });
        result = object;
      }
      snapshot.current = {
        values,
        result,
      };
      return result;
    }) as TUnitValues<S>;
  }

  /**
   * A value computed from a store; re-renders only when the result changes (`!==`, or `updateFilter`). `keys` — what
   * `fn` depends on besides the state; a change of them computes it again (effector-react's `useStoreMap`).
   *
   * @example
   * const section = useStoreMap(nav.$state, (state) => state.section);
   * const confirming = useStoreMap({
   *   store: nav.$state,
   *   keys: [entryId],
   *   fn: (state, [id]) => state.entries.some((entry) => entry.id === id && entry.confirmingLeave),
   * });
   */
  function useStoreMap<S, R>(store: TStore<S>, fn: (state: S) => R): R;
  function useStoreMap<S, R, K extends readonly unknown[]>(config: TStoreMapConfig<S, R, K>): R;
  function useStoreMap<S, R, K extends readonly unknown[]>(storeOrConfig: TStore<S> | TStoreMapConfig<S, R, K>, select?: (state: S) => R): R {
    const config = isStore(storeOrConfig)
      ? {
        store: storeOrConfig,
        keys: NO_KEYS as unknown as K,
        fn: select as (state: S, keys: K) => R,
      } as TStoreMapConfig<S, R, K>
      : storeOrConfig;
    const {
      store,
      keys,
      fn,
      updateFilter,
    } = config;
    const hasDefault = 'defaultValue' in config;
    const last = useRef(null) as { current: { state: S;
      keys: K;
      value: R; } | null; };
    return useSyncExternalStore(subscribeTo(store as TStore), () => {
      const state = store.getState();
      const previous = last.current;
      if (previous && previous.state === state && sameList(previous.keys, keys)) {
        return previous.value;
      }
      let value = fn(state, keys);
      if (value === undefined && hasDefault) {
        value = config.defaultValue as R;
      }
      // Kept when equal — or when `updateFilter` says no: the component doesn't re-render
      const keep = previous && (updateFilter ? !updateFilter(value, previous.value) : value === previous.value);
      last.current = {
        state,
        keys,
        value: keep ? (previous as { value: R }).value : value,
      };
      return last.current.value;
    });
  }

  return {
    useUnit,
    useStoreMap,
  };
}
