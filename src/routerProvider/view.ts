// The router's host component (`NavigationHostProvider`) and its hooks, over the router's stack.
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TNavigationHostOptions,
  TRouterProviderDeps,
  TRouterState,
  TWindowEntry,
} from './types';
import type {
  TDependencyList,
  TEffectCallback,
  TRouterCore,
} from './internalTypes';
import {
  LAYER,
  NAVIGATION_HOST_OPTION_KEYS,
  ROUTER_WHERE,
  WINDOW,
} from './constants';

/**
 * The router's hooks and its view, over its stack (`core`) and the injected view library (`deps`). Outside the view's
 * host a hook belongs to the top entry at render (the old `useRouteIsFocus` use).
 */
export function createRouterView(deps: TRouterProviderDeps, core: TRouterCore) {
  const {
    createContext,
    createElement,
    useContext,
    useEffect,
    useRef,
    useState,
  } = deps;
  // The core's functions, taken once — not looked up on the object at every render (D-035).
  const {
    $state,
    close,
    entries,
    onBeforeLeave,
    onForward,
    own,
    whileOpen,
  } = core;
  // ── the view ──────────────────────────────────────────────────────────────────────────────────────────────────

  /** The entry a component is rendered in (inside the router's `NavigationHost`). */
  const EntryContext = createContext(null);

  /** The entry a component belongs to: the one it is rendered in, or (outside the host) the top entry at render. */
  function currentEntry(): TEntry {
    const entry = useContext(EntryContext) as TEntry | null;
    if (entry) {
      return entry;
    }
    const all = entries();
    return all[all.length - 1];
  }

  /**
   * `effect` while the entry this component is rendered in is open: cleaned up when it starts being left (before its
   * watchers are asked), run again if leaving is refused. `useWhileOpen` is the same with the latest `effect`.
   */
  const useRouteIsFocus = (effect: TEffectCallback, deps_?: TDependencyList) => {
    const entryId = currentEntry().id;
    useEffect(() => whileOpen(entryId, effect as () => void | (() => void)), deps_ || []);
  };

  /** Keeps the latest callback in a ref, so a registration made once calls what the component rendered last. */
  function useLatest<T>(value: T): { current: T } {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  }

  /** The router's state, re-rendering on change. */
  function useRouterState(): TRouterState {
    const [
      value,
      setValue,
    ] = useState($state.getState);
    useEffect(() => $state.watch(setValue), []);
    return value;
  }

  /**
   * Builds the router's host component, `NavigationHost` (D-036) — the page layers (the shown page and the kept ones,
   * each its own scroll container, hidden ones `display: none`) and the windows over them, drawn with `renderPage` /
   * `renderWindow`. Returns the component itself.
   *
   * @example
   * const NavigationHost = router.NavigationHostProvider({
   *   renderPage: (entry, location) => <Page path={location.path} />,
   *   renderWindow: (entry, props) => <entry.window {...props} />,
   * });
   * root.render(<NavigationHost />);
   */
  function NavigationHostProvider(options: TNavigationHostOptions): () => unknown {
    if (!isObject(options)) {
      throw new TypeError(`${ROUTER_WHERE} NavigationHostProvider: expects an options object, got ${describeValue(options)}`);
    }
    assertKnownOptions(
      `${ROUTER_WHERE} NavigationHostProvider`, options, NAVIGATION_HOST_OPTION_KEYS,
    );
    for (const key of NAVIGATION_HOST_OPTION_KEYS) {
      if (!isFunction(options[key])) {
        throw new TypeError(`${ROUTER_WHERE} NavigationHostProvider: "${key}" expects a function, got ${describeValue(options[key])}`);
      }
    }
    const h = createElement;
    // Called for every layer and window at every render: taken from the options once (D-035).
    const {
      renderPage,
      renderWindow,
    } = options;

    function withEntry(entry: TEntry, child: unknown): unknown {
      return h(
        (EntryContext as { Provider: unknown }).Provider, {
          value: entry,
          key: entry.id,
        }, child,
      );
    }

    function NavigationHost(): unknown {
      const value = useRouterState();
      // Layers of every section's stack, in a stable order: a layer that moved in the DOM would lose its scroll.
      const layers = value.layers.map((entry) => {
        const shown = entry === value.page;
        return h(
          'div', {
            key: entry.id,
            'data-nav-layer': entry.depth,
            'aria-hidden': shown ? undefined : 'true',
            style: {
              ...LAYER,
              display: shown ? 'block' : 'none',
            },
          }, withEntry(entry, renderPage(entry, own(entry.location))),
        );
      });
      const shownWindows = value.entries.filter((entry): entry is TWindowEntry => entry.kind === WINDOW);
      const windows = [
        ...shownWindows,
        ...value.leaving,
      ].map((entry) => withEntry(entry, renderWindow(entry, {
        params: entry.params,
        open: shownWindows.includes(entry),
        close: (result?: unknown) => {
          void close(entry.id, result);
        },
      })));
      return h(
        'div', {
          'data-nav-host': '',
          style: {
            position: 'absolute',
            inset: 0,
          },
        },
        ...layers,
        ...windows,
      );
    }

    return NavigationHost;
  }

  /** The entry this component is rendered in (inside the `NavigationHost`). */
  function useEntry(): TEntry {
    const entry = useContext(EntryContext) as TEntry | null;
    if (!entry) {
      throw new Error('routerProvider: useEntry is used outside a page or a window of the NavigationHost');
    }
    return entry;
  }

  return {
    useRouteIsFocus,
    NavigationHostProvider,
    useEntry,
    useRouterState,
    /** `effect` while this component's entry is open (the latest `effect` is used; see `useRouteIsFocus`). */
    useWhileOpen: (effect: () => void | (() => void)) => {
      const latest = useLatest(effect);
      useRouteIsFocus(() => latest.current(), []);
    },
    /** `handler` before a page (with `{ windows: true }` — also a window) opens over this component's entry. */
    useOnForward: (handler: TForwardHandler, options?: { windows?: boolean }) => {
      const entryId = currentEntry().id;
      const latest = useLatest(handler);
      const windows = Boolean(options?.windows);
      useEffect(() => onForward(
        entryId, () => latest.current(), {
          windows,
        },
      ), [windows]);
    },
    /** `guard` before this component's entry is left by going back — "discard changes?". */
    useBeforeLeave: (guard: TLeaveGuard) => {
      const entryId = currentEntry().id;
      const latest = useLatest(guard);
      useEffect(() => onBeforeLeave(entryId, () => latest.current()), []);
    },
  };
}
