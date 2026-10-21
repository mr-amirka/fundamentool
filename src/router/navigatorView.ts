// The navigator's view: the host (`NavigationHostProvider`) drawing the page layers and the windows from the route
// table, the hooks of the entry a component is rendered in, and `Link` / `NavLink` — built on fundamentool's view
// bindings (`viewHooksProvider`, `linksProvider`, D-049).
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
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
import type {
  TUrlProps,
} from '../urlParse';
import {
  linksProvider,
  targetOf,
} from '../view/linksProvider';
import type {
  TLinkProps,
} from '../view/linksProvider';
import {
  viewHooksProvider,
} from '../view/viewHooksProvider';
import {
  WINDOW,
} from './constants';
import {
  isFixedPattern,
} from './routeTable';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TNavigationHostOptions,
  TNavigatorDeps,
  TNavigatorState,
  TPageEntry,
  TRouteRow,
  TWindowEntry,
} from './types';

const WHERE = '[fundamentool] createNavigator';

/** The single list of `NavigationHostProvider`'s option keys. */
export const NAVIGATION_HOST_OPTION_KEYS = [
  'routes',
  'render',
  'renderWindow',
] as const;

/** The navigator's flags of a row. */
const ROW_FLAGS = [
  'keep',
  'section',
  'quietQuery',
] as const;

/** A page layer: its own scroll container (keeps its scroll under `display: none` — research web-games 02 §6.1). */
const LAYER = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};

/** What the view needs from the navigator's engine. */
export type TNavigatorCore = {
  $state: Observable<TNavigatorState>;
  /** The entries now, bottom to top. */
  entries: () => readonly TEntry[];
  close: (entryId: number, result?: unknown) => Promise<void>;
  whileOpen: (entryId: number, effect: () => void | (() => void)) => () => void;
  onForward: (entryId: number, handler: TForwardHandler, options?: { windows?: boolean }) => () => void;
  onBeforeLeave: (entryId: number, guard: TLeaveGuard) => () => void;
  setRoutes: (routes: readonly TRouteRow[]) => void;
  /** The section whose root a location is (`null` — not a root, or no sections). */
  rootOf: (location: TUrlProps) => string | null;
};

function assertHostOptions(options: TNavigationHostOptions): void {
  if (!isObject(options) || isArray(options)) {
    throw new TypeError(`${WHERE} NavigationHostProvider: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    `${WHERE} NavigationHostProvider`, options, NAVIGATION_HOST_OPTION_KEYS,
  );
  const routes = options.routes;
  if (!isArray(routes)) {
    throw new TypeError(`${WHERE} NavigationHostProvider: "routes" expects the route table ([pattern, row][]), got ${describeValue(routes)}`);
  }
  let firstRoot = true;
  for (const row of routes) {
    if (!isArray(row) || typeof row[0] !== 'string' || !isObject(row[1])) {
      throw new TypeError(`${WHERE} NavigationHostProvider: a row of "routes" expects [pattern, { … }], got ${describeValue(row)}`);
    }
    const pattern = row[0];
    const fields = row[1] as TRouteRow[1] & { main?: unknown };
    if (!options.render && fields.main === undefined) {
      throw new TypeError(`${WHERE} NavigationHostProvider: the row "${pattern}" has no "main" — give it one, or a "render" that draws the row`);
    }
    for (const key of ROW_FLAGS) {
      const value = fields[key];
      if (value !== undefined && typeof value !== 'boolean') {
        throw new TypeError(`${WHERE} NavigationHostProvider: the row "${pattern}": "${key}" expects true or false, got ${describeValue(value)}`);
      }
    }
    if (fields.section && firstRoot) {
      firstRoot = false;
      if (!isFixedPattern(pattern)) {
        throw new TypeError(`${WHERE} NavigationHostProvider: the start section's root "${pattern}" is put under deep links — it needs a path without parameters`);
      }
    }
  }
  for (const key of [
    'render',
    'renderWindow',
  ] as const) {
    if (options[key] !== undefined && !isFunction(options[key])) {
      throw new TypeError(`${WHERE} NavigationHostProvider: "${key}" expects a function, got ${describeValue(options[key])}`);
    }
  }
}

/** An entry's facts the fact hooks read (D-047, D-049). */
type TEntryFact = 'confirmingLeave' | 'leaveGuarded';

/**
 * The navigator's host, hooks and links, over its engine (`core`) and the injected view library (`deps`). A hook
 * belongs to the page or window it is rendered in; outside the host — to the entry on top (the fact hooks follow it as
 * it changes; registrations take the one on top at their first render).
 */
export function createNavigatorView(deps: TNavigatorDeps, core: TNavigatorCore) {
  const {
    createContext,
    createElement: h,
    useContext,
    useEffect,
    useRef,
  } = deps;
  // The engine's functions, taken once — not looked up on the object at every render (D-035).
  const {
    $state,
    close,
    entries,
    onBeforeLeave,
    onForward,
    whileOpen,
    setRoutes,
    rootOf,
  } = core;
  const {
    useUnit,
    useStoreMap,
  } = viewHooksProvider(deps);
  const links = linksProvider(deps);

  /** The entry a component is rendered in (inside the host): its id — the same through a page's steps. */
  const EntryContext = createContext(null);

  /** The entry a component belongs to: the one it is rendered in, or (outside the host) the top entry at render. */
  function currentEntryId(): number {
    const id = useContext(EntryContext) as number | null;
    if (id !== null) {
      return id;
    }
    const all = entries();
    return all[all.length - 1].id;
  }

  /**
   * The entry `id` names in a state: the latest of its steps in the stack, a kept page of another section, or a window
   * playing its exit; `undefined` — it is gone.
   */
  function entryIn(value: TNavigatorState, id: number): TEntry | undefined {
    const list = value.entries;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return value.layers.find((entry) => entry.id === id) || value.leaving.find((entry) => entry.id === id);
  }

  /**
   * A fact of the entry a fact hook watches: the page it is rendered in (`id` from the host), or — outside the host —
   * whichever entry is on top in this state (it follows the top as it changes).
   */
  function factIn(
    value: TNavigatorState, id: number | null, fact: TEntryFact,
  ): boolean {
    if (id === null) {
      const list = value.entries;
      return list[list.length - 1][fact];
    }
    return !!entryIn(value, id)?.[fact];
  }

  /** Keeps the latest callback in a ref, so a registration made once calls what the component rendered last. */
  function useLatest<T>(value: T): { current: T } {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  }

  /**
   * The navigator's state — re-rendering at every change of it; with `select`, only when the selected value changes
   * (`useStoreMap`, D-049).
   *
   * @example
   * const state = nav.useNavigatorState();                          // everything
   * const section = nav.useNavigatorState((state) => state.section); // the tab bar: only on a tab switch
   */
  function useNavigatorState(): TNavigatorState;
  function useNavigatorState<R>(select: (state: TNavigatorState) => R): R;
  function useNavigatorState<R>(select?: (state: TNavigatorState) => R): TNavigatorState | R {
    return useStoreMap($state, select || (identity as (state: TNavigatorState) => R));
  }

  /**
   * Builds the navigator's host (fundamentool D-038): the page layers (the shown page and the kept ones, each its own
   * scroll container, hidden ones `display: none`) and the windows over them. The route table is the only description
   * of the pages: a row's `keep` and `section` are the navigator's, the rest is the app's — `render` draws a row
   * (default: `createElement(row.main, { route })`).
   *
   * @example
   * const NavigationHost = nav.NavigationHostProvider({
   *   routes: [['/', { main: Home, keep: true }], ['/level/:levelId', { main: Level }]],
   * });
   * root.render(<NavigationHost />);
   */
  function NavigationHostProvider<R = Record<string, unknown>>(options: TNavigationHostOptions<R>): () => unknown {
    assertHostOptions(options as TNavigationHostOptions);
    // Called for every layer and window at every render: taken from the options once (D-035).
    const {
      routes,
      render = (row: { main?: unknown }, route: unknown) => h(row.main, {
        route,
      }),
      renderWindow = (entry: TWindowEntry, props: unknown) => h(entry.window, props),
    } = options as TNavigationHostOptions;
    setRoutes(routes as readonly TRouteRow[]);

    function withEntry(entry: TEntry, child: unknown): unknown {
      return h(
        (EntryContext as { Provider: unknown }).Provider, {
          // The id, not the entry: it stays the same through the page's steps, so the hooks under it don't re-render.
          value: entry.id,
          key: entry.id,
        }, child,
      );
    }

    /** What each page was last drawn with, by page: its location and the element (reused — the page isn't re-rendered). */
    let drawn = new Map<number, [location: TUrlProps, element: unknown]>();

    /**
     * A page by its row; a path no row fits draws nothing ("not found" is a catch-all last row). Drawn again only when
     * its location changed — and for a `quietQuery` row, only when its path did (D-043): the page keeps its `route`, its
     * parts follow the query through `router.params`. Its entry's facts reach it through the hooks.
     */
    function drawPage(entry: TPageEntry, next: typeof drawn): unknown {
      const row = entry.row;
      if (!row) {
        return null;
      }
      const location = entry.location;
      const last = drawn.get(entry.id);
      if (last && (last[0] === location || row.quietQuery && last[0].path === location.path)) {
        next.set(entry.id, last);
        return last[1];
      }
      const element = render(
        row, {
          params: entry.params,
          location,
        }, entry,
      );
      next.set(entry.id, [
        location,
        element,
      ]);
      return element;
    }

    function NavigationHost(): unknown {
      const value = useUnit($state);
      const next = new Map<number, [location: TUrlProps, element: unknown]>();
      // Layers of every tab's stack, in a stable order: a layer that moved in the DOM would lose its scroll.
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
          }, withEntry(entry, drawPage(entry, next)),
        );
      });
      drawn = next;
      const shownWindows = value.entries.filter((entry): entry is TWindowEntry => entry.kind === WINDOW && entry.window !== null);
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

  /**
   * The entry this component is rendered in (inside the host), re-rendering at every change of it — every step of the
   * page included; for one fact prefer its hook (`useConfirmingLeave`, `useLeaveGuarded`). A gone entry keeps its last
   * value.
   */
  function useEntry(): TEntry {
    const id = useContext(EntryContext) as number | null;
    if (id === null) {
      throw new Error(`${WHERE}: useEntry is used outside a page or a window of the NavigationHost`);
    }
    return useStoreMap({
      store: $state,
      keys: [id] as const,
      fn: (value, [entryId]) => entryIn(value, entryId) as TEntry,
      updateFilter: (update, current) => !!update && update !== current,
    });
  }

  /** `effect` while this component's entry is open: cleaned up when it starts being left, run again if that's refused. */
  function useWhileOpen(effect: () => void | (() => void)): void {
    const entryId = currentEntryId();
    const latest = useLatest(effect);
    useEffect(() => whileOpen(entryId, () => latest.current()), []);
  }

  /** `handler` before a page (with `{ windows: true }` — also a window) opens over this component's entry. */
  function useOnForward(handler: TForwardHandler, options?: { windows?: boolean }): void {
    const entryId = currentEntryId();
    const latest = useLatest(handler);
    const windows = Boolean(options?.windows);
    useEffect(() => onForward(
      entryId, () => latest.current(), {
        windows,
      },
    ), [windows]);
  }

  /**
   * `guard` before this component's entry is left by going back — "discard changes?". `null` — no guard: register one
   * only while there is something to lose, and the entry's `leaveGuarded` means "unsaved" (D-049).
   *
   * @example
   * nav.useBeforeLeave(dirty ? () => confirmDiscard() : null);
   */
  function useBeforeLeave(guard: TLeaveGuard | null | undefined): void {
    const entryId = currentEntryId();
    const latest = useLatest(guard);
    const active = isFunction(guard);
    useEffect(() => (active ? onBeforeLeave(entryId, () => (latest.current as TLeaveGuard)()) : undefined), [active]);
  }

  /** A fact of this component's entry (outside the host — of the entry on top); re-renders only when it flips. */
  function useFact(fact: TEntryFact): boolean {
    const id = useContext(EntryContext) as number | null;
    return useStoreMap({
      store: $state,
      keys: [
        id,
        fact,
      ] as const,
      fn: (value, [
        entryId,
        name,
      ]) => factIn(
        value, entryId, name,
      ),
    });
  }

  /**
   * `effect` runs when a fact of this component's entry becomes true; its cleanup when it becomes false again, or the
   * component unmounts. No re-render.
   */
  function useFactEffect(fact: TEntryFact, effect: () => void | (() => void)): void {
    const id = useContext(EntryContext) as number | null;
    const latest = useLatest(effect);
    useEffect(() => {
      let cleanup: void | (() => void);
      const end = () => {
        isFunction(cleanup) && cleanup();
        cleanup = undefined;
      };
      let last = false;
      // A store's watch fires at once (D-049): already true at mount — the effect runs now
      const stop = $state.watch((value) => {
        const now = factIn(
          value, id, fact,
        );
        if (now === last) {
          return;
        }
        last = now;
        if (now) {
          cleanup = latest.current();
        } else {
          end();
        }
      });
      return () => {
        stop();
        end();
      };
    }, []);
  }

  /**
   * Whether this page's leave is being confirmed (D-047) — re-renders only when it flips.
   *
   * @example
   * const confirming = nav.useConfirmingLeave();
   * return <Button disabled={confirming}>Save</Button>;
   */
  const useConfirmingLeave = (): boolean => useFact('confirmingLeave');

  /**
   * `effect` runs when this page's leave starts being confirmed; its cleanup runs when that ends — the leave refused
   * (the page stays) or done (the page is gone) — or when the component unmounts (D-047). No re-render.
   *
   * @example
   * nav.useConfirmingLeaveEffect(() => {
   *   video.pause();
   *   return () => video.play(); // the player chose to stay
   * });
   */
  const useConfirmingLeaveEffect = (effect: () => void | (() => void)): void => useFactEffect('confirmingLeave', effect);

  /**
   * Whether this page has a leave guard — leaving it would ask (D-049); outside the host — the entry on top: what
   * Back would leave. Re-renders only when it flips.
   *
   * @example
   * function UnsavedDot() { return nav.useLeaveGuarded() ? <span className="dot" /> : null; } // in the app's header
   */
  const useLeaveGuarded = (): boolean => useFact('leaveGuarded');

  /**
   * `effect` runs when this page gets a leave guard; its cleanup when it loses it, or the component unmounts.
   *
   * @example
   * nav.useLeaveGuardedEffect(() => {          // VK: the native swipe-back can't wait for a question
   *   bridge.send('VKWebAppSetSwipeSettings', { history: false });
   *   return () => bridge.send('VKWebAppSetSwipeSettings', { history: true });
   * });
   */
  const useLeaveGuardedEffect = (effect: () => void | (() => void)): void => useFactEffect('leaveGuarded', effect);

  /**
   * Whether some entry — in any section — has a leave guard: leaving the app would lose something. Re-renders only when
   * it flips.
   */
  const useAnyLeaveGuarded = (): boolean => useStoreMap($state, anyLeaveGuardedOf);

  /** The navigator's `NavLink`: also active while the section whose root it leads to is shown (a tab). */
  function NavLink(props: TLinkProps): unknown {
    const sectionShown = useStoreMap({
      store: $state,
      keys: [props.href] as const,
      fn: (value, [href]) => value.section !== null && rootOf(targetOf(href, value.location)) === value.section,
    });
    return h(links.NavLink, {
      ...props,
      active: props.active || sectionShown,
    });
  }

  return {
    NavigationHostProvider,
    useNavigatorState,
    useEntry,
    useWhileOpen,
    useOnForward,
    useBeforeLeave,
    useConfirmingLeave,
    useConfirmingLeaveEffect,
    useLeaveGuarded,
    useLeaveGuardedEffect,
    useAnyLeaveGuarded,
    Link: links.Link,
    NavLink,
  };
}

/** The whole state, as it is. */
const identity = <T>(value: T): T => value;

/** The state's "some entry has a leave guard". */
const anyLeaveGuardedOf = (state: TNavigatorState): boolean => state.anyLeaveGuarded;
