// The navigator's view: the host (`NavigationHostProvider`) drawing the page layers and the windows from the route
// table, the hooks of the entry a component is rendered in, and `Link` / `NavLink`.
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
  withAsyncLock,
} from '../withAsyncLock';
import {
  WINDOW,
} from './constants';
import {
  locate,
  pathPrefix,
  resolveHref,
} from './location';
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
  isConfirmingLeave: (entryId: number) => boolean;
  watchConfirmingLeave: (entryId: number, listener: (confirming: boolean) => void) => () => void;
};

/** A link's props: where it goes, and the anchor's own. */
export type TLinkProps = {
  /**
   * Where it goes in this router's part (D-043): a string read as `<a href>` reads it (`/level/2`, `?tab=map`, `42`), or
   * a change of the current location (`{ path, query }` — the values encoded, no `path` — the current one). Left out —
   * the current location.
   */
  href?: string | Partial<TUrlProps>;
  /** `false` (or a promise of it) cancels the step. */
  onClick?: (event: { preventDefault?: () => void }) => unknown;
  /** The element to render instead of `a`. */
  component?: unknown;
  /** NavLink: active also on the pages under this one. */
  activeAsParent?: boolean;
} & Record<string, unknown>;

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

/**
 * The navigator's host, hooks and links, over its engine (`core`) and the injected view library (`deps`). Outside the
 * host a hook belongs to the top entry at render.
 */
export function createNavigatorView(deps: TNavigatorDeps, core: TNavigatorCore) {
  const {
    router,
    createContext,
    createElement,
    forwardRef,
    useContext,
    useEffect,
    useRef,
    useState,
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
    isConfirmingLeave,
    watchConfirmingLeave,
  } = core;
  const h = createElement;
  const primitive = router.historyPrimitive;

  /** The entry a component is rendered in (inside the host). */
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

  /** Keeps the latest callback in a ref, so a registration made once calls what the component rendered last. */
  function useLatest<T>(value: T): { current: T } {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  }

  /** The navigator's state, re-rendering on change. */
  function useNavigatorState(): TNavigatorState {
    const [
      value,
      setValue,
    ] = useState($state.getState);
    useEffect(() => $state.watch(setValue), []);
    return value;
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
     * parts follow the query through `router.params`. Its entry's flags reach it through the hooks (`useConfirmingLeave`, …).
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
      const value = useNavigatorState();
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

  /** The entry this component is rendered in (inside the host). */
  function useEntry(): TEntry {
    const id = useContext(EntryContext) as number | null;
    if (id === null) {
      throw new Error(`${WHERE}: useEntry is used outside a page or a window of the NavigationHost`);
    }
    const [
      entry,
      setEntry,
    ] = useState(() => entryIn($state.getState(), id) as TEntry);
    // Re-renders when this entry changes (a step of the page, a flag); a gone entry keeps its last value.
    useEffect(() => $state.watch((value) => {
      const next = entryIn(value, id);
      next && setEntry(next);
    }), []);
    return entry;
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

  /** `guard` before this component's entry is left by going back — "discard changes?". */
  function useBeforeLeave(guard: TLeaveGuard): void {
    const entryId = currentEntryId();
    const latest = useLatest(guard);
    useEffect(() => onBeforeLeave(entryId, () => latest.current()), []);
  }

  /**
   * Whether this page's leave is being confirmed (D-047) — the component re-renders only when it flips, not at every
   * step of the page.
   *
   * @example
   * const confirming = nav.useConfirmingLeave();
   * return <Button disabled={confirming}>Save</Button>;
   */
  function useConfirmingLeave(): boolean {
    const entryId = currentEntryId();
    const [
      value,
      setValue,
    ] = useState(() => isConfirmingLeave(entryId));
    useEffect(() => watchConfirmingLeave(entryId, setValue), []);
    return value;
  }

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
  function useConfirmingLeaveEffect(effect: () => void | (() => void)): void {
    const entryId = currentEntryId();
    const latest = useLatest(effect);
    useEffect(() => {
      let cleanup: void | (() => void);
      const end = () => {
        isFunction(cleanup) && cleanup();
        cleanup = undefined;
      };
      // Mounted while it is already being confirmed: the effect runs now.
      if (isConfirmingLeave(entryId)) {
        cleanup = latest.current();
      }
      const stop = watchConfirmingLeave(entryId, (confirming) => {
        if (confirming) {
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

  /** Where a link goes: its `href` read against the current location (left out — the current location). */
  function targetOf(href: TLinkProps['href']): TUrlProps {
    const current = router.getLocation();
    if (href === undefined) {
      return current;
    }
    return typeof href === 'string' ? resolveHref(href, current) : locate(href, current);
  }

  /** One click at a time across the links (a double tap doesn't step twice). */
  const click = withAsyncLock(async (
    event: unknown, onClick: TLinkProps['onClick'], target: TUrlProps,
  ) => {
    if (!onClick || (await onClick(event as never)) !== false) {
      await router.pushLocation(target);
    }
  });

  /** An anchor in this router's part: its `href` is what the address bar would show; a click steps there. */
  const Link = forwardRef((props: TLinkProps, ref: unknown) => {
    const {
      href,
      onClick,
      component,
      activeAsParent: _activeAsParent,
      ...anchor
    } = props;
    const target = targetOf(href);
    return h(component || 'a', {
      ...anchor,
      ref,
      href: primitive.href(target),
      onClick: (event: { preventDefault?: () => void }) => {
        event.preventDefault?.();
        void click(
          event, onClick, target,
        );
      },
    });
  });

  /**
   * A `Link` with `className="active"` while its address is the shown one (`activeAsParent` — or a page under it), or
   * while it leads to the root of the section shown (a tab).
   */
  function NavLink(props: TLinkProps): unknown {
    const {
      location,
      section,
    } = useNavigatorState();
    const target = targetOf(props.href);
    const path = location.path;
    // A resolved target always has a path (`resolveHref`, `locate`).
    const targetPath = target.path;
    const active = path === targetPath
      || !!props.activeAsParent && path.startsWith(pathPrefix(targetPath))
      || section !== null && rootOf(target) === section;
    return h(Link, {
      ...props,
      className: active ? ('active ' + (props.className || '')).trim() : props.className,
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
    Link,
    NavLink,
  };
}
