// The hooks of fundamentool's view library (fundamentool D-072) — React's, with React's semantics: state kept by call
// order, effects by their dependencies, `Object.is` comparisons.
import {
  INSERTION,
  LAYOUT,
  nextHook,
  PASSIVE,
  schedule,
} from './reconciler';
import type {
  THook,
} from './reconciler';
import type {
  TRef,
} from './element';

/** A new state, or a function of the old one. */
export type TSetStateAction<S> = S | ((state: S) => S);

/** An effect: runs after the render, returns its cleanup. */
export type TEffect = () => void | (() => void);

/** Whether the dependencies changed (no dependencies — always). */
function depsChanged(old: readonly any[] | undefined, deps: readonly any[] | undefined): boolean {
  if (!old || !deps) {
    return true;
  }
  const length = deps.length;
  if (length !== old.length) {
    return true;
  }
  let i = 0;
  for (; i < length; i++) {
    if (!Object.is(old[i], deps[i])) {
      return true;
    }
  }
  return false;
}

/** Marks an effect to run when its dependencies changed. */
function effect(
  tag: number, create: TEffect, deps: readonly any[] | undefined,
): void {
  const hook = nextHook();
  if (depsChanged(hook.deps, deps)) {
    hook.tag = tag;
    hook.create = create;
    hook.deps = deps;
    hook.run = true;
  }
}

/** The state of a `useState` / `useReducer` hook and its stable `dispatch`: a change renders the component again. */
function stateOf(hook: THook, reducer: (state: any, action: any) => any): [any, (action: any) => void] {
  hook.reducer = reducer;
  if (!hook.dispatch) {
    const f = hook.fiber;
    hook.dispatch = (action: any) => {
      const next = hook.reducer(hook.value, action);
      if (!Object.is(next, hook.value)) {
        hook.value = next;
        schedule(f);
      }
    };
  }
  return [
    hook.value,
    hook.dispatch,
  ];
}

function setStateReducer(state: any, action: any): any {
  return typeof action === 'function' ? action(state) : action;
}

/**
 * A component's state — React's `useState`: `set` with the same value (`Object.is`) doesn't render again.
 *
 * @param initial - The first value, or a function computing it (called once).
 * @returns `[value, set]` — `set` keeps its identity.
 * @example
 * const [count, setCount] = useState(0);
 * setCount((count) => count + 1);
 */
export function useState<S>(initial: S | (() => S)): [S, (action: TSetStateAction<S>) => void] {
  const hook = nextHook();
  if (!hook.dispatch) {
    hook.value = typeof initial === 'function' ? (initial as () => S)() : initial;
  }
  return stateOf(hook, setStateReducer);
}

/**
 * State changed by actions — React's `useReducer`.
 *
 * @param reducer - `(state, action) => newState`.
 * @param arg - The first state (or `init`'s argument).
 * @param init - Computes the first state from `arg`.
 * @returns `[state, dispatch]`.
 * @example
 * const [todos, dispatch] = useReducer(todosReducer, []);
 * dispatch({ type: 'add', text });
 */
export function useReducer<S, A, I = S>(
  reducer: (state: S, action: A) => S,
  arg: I,
  init?: (arg: I) => S,
): [S, (action: A) => void] {
  const hook = nextHook();
  if (!hook.dispatch) {
    hook.value = init ? init(arg) : arg;
  }
  return stateOf(hook, reducer);
}

/**
 * An effect after the render is painted — React's `useEffect`: again when a dependency changed, its cleanup before.
 *
 * @param create - The effect; returns its cleanup.
 * @param deps - Its dependencies; none — after every render.
 * @example
 * useEffect(() => store.subscribe(onChange), [store]);
 */
export function useEffect(create: TEffect, deps?: readonly any[]): void {
  effect(
    PASSIVE, create, deps,
  );
}

/**
 * An effect right after the DOM changed, before the browser paints — React's `useLayoutEffect`.
 *
 * @param create - The effect; returns its cleanup.
 * @param deps - Its dependencies.
 * @example
 * useLayoutEffect(() => setHeight(ref.current!.offsetHeight), []);
 */
export function useLayoutEffect(create: TEffect, deps?: readonly any[]): void {
  effect(
    LAYOUT, create, deps,
  );
}

/**
 * An effect as the component's DOM is made, before any layout effect — for style libraries (emotion).
 *
 * @param create - The effect; returns its cleanup.
 * @param deps - Its dependencies.
 * @example
 * useInsertionEffect(() => sheet.insert(rule), [rule]);
 */
export function useInsertionEffect(create: TEffect, deps?: readonly any[]): void {
  effect(
    INSERTION, create, deps,
  );
}

/**
 * A box kept for the component's whole life — React's `useRef`.
 *
 * @param initial - Its first `current`.
 * @returns The same object at every render.
 * @example
 * const input = useRef<HTMLInputElement>(null);
 */
export function useRef<T>(initial: T): { current: T };
export function useRef<T = undefined>(): { current: T | undefined };
export function useRef(initial?: any): { current: any } {
  const hook = nextHook();
  return hook.ref || (hook.ref = {
    current: initial,
  });
}

/**
 * A value computed again only when a dependency changed — React's `useMemo`.
 *
 * @param factory - Computes the value.
 * @param deps - Its dependencies.
 * @returns The value.
 * @example
 * const sorted = useMemo(() => items.slice().sort(byName), [items]);
 */
export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T {
  const hook = nextHook();
  if (depsChanged(hook.deps, deps)) {
    hook.deps = deps;
    hook.value = factory();
  }
  return hook.value;
}

/**
 * The same function while the dependencies are the same — React's `useCallback`.
 *
 * @param callback - The function.
 * @param deps - Its dependencies.
 * @returns The function kept.
 * @example
 * const onSave = useCallback(() => save(draft), [draft]);
 */
export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T {
  const hook = nextHook();
  if (depsChanged(hook.deps, deps)) {
    hook.deps = deps;
    hook.value = callback;
  }
  return hook.value;
}

/**
 * What a ref given to the component shows to its owner — React's `useImperativeHandle`.
 *
 * @param ref - The ref given.
 * @param create - Makes what the ref shows.
 * @param deps - Its dependencies.
 * @example
 * useImperativeHandle(ref, () => ({ focus: () => input.current!.focus() }), []);
 */
export function useImperativeHandle<T>(
  ref: TRef<T>, create: () => T, deps?: readonly any[],
): void {
  effect(
    LAYOUT, () => {
      if (typeof ref === 'function') {
        const cleanup = ref(create());
        return typeof cleanup === 'function' ? cleanup : () => {
          ref(null);
        };
      }
      if (ref) {
        ref.current = create();
        return () => {
          ref.current = null as any;
        };
      }
    }, deps ? deps.concat([ref]) : deps,
  );
}

/** React's `useDebugValue` — a label for React's developer tools; nothing here. */
export function useDebugValue(_value: unknown, _format?: (value: any) => any): void {
  // no developer tools to show it in
}

let ids = 0;

/**
 * An id unique in the page and kept for the component's life — React's `useId` (`_r_1_`; valid in selectors).
 *
 * @returns The id.
 * @example
 * const id = useId();
 * <label htmlFor={id}>Name</label><input id={id} />
 */
export function useId(): string {
  const hook = nextHook();
  return hook.id || (hook.id = '_r_' + (ids++).toString(32) + '_');
}

/**
 * Reads an outside store — React's `useSyncExternalStore`: the snapshot at every render, the component rendered again
 * when it changes (`Object.is`).
 *
 * @param subscribe - Subscribes a listener; returns the unsubscribe.
 * @param getSnapshot - The store's value now (the same value while it hasn't changed).
 * @returns The value.
 * @example
 * const width = useSyncExternalStore(onResize, () => window.innerWidth);
 */
export function useSyncExternalStore<T>(subscribe: (onChange: () => void) => () => void, getSnapshot: () => T): T {
  const value = getSnapshot();
  const hook = nextHook();
  hook.value = value;
  hook.get = getSnapshot;
  if (!hook.check) {
    const f = hook.fiber;
    hook.check = () => {
      if (!Object.is(hook.value, hook.get())) {
        schedule(f);
      }
    };
  }
  const check = hook.check;
  // changed between the render and the commit
  useLayoutEffect(check, [
    subscribe,
    value,
    getSnapshot,
  ]);
  useEffect(() => {
    check();
    return subscribe(check);
  }, [subscribe]);
  return value;
}

/**
 * A function that always calls the latest `callback` — for effects that read the newest props without depending on
 * them (React's `useEffectEvent`).
 *
 * @param callback - The function as of this render.
 * @returns A function kept for the component's life.
 * @example
 * const onTick = useEffectEvent(() => log(count));
 * useEffect(() => createInterval(onTick, 1000), []);
 */
export function useEffectEvent<T extends (...args: any[]) => any>(callback: T): T {
  const hook = nextHook();
  hook.callback = callback;
  return hook.call || (hook.call = function (this: unknown) {
    return hook.callback.apply(this, arguments);
  });
}
