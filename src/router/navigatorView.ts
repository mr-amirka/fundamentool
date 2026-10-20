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
import {
  urlExtend,
} from '../urlExtend';
import {
  urlParse,
} from '../urlParse';
import type {
  TUrlProps,
} from '../urlParse';
import {
  withAsyncLock,
} from '../withAsyncLock';
import {
  ROOT_PATH,
  WINDOW,
} from './constants';
import {
  routerInternal,
} from './internal';
import type {
  TRouterInternal,
} from './internal';
import {
  locate,
  pathPrefix,
} from './location';
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
};

/** A link's props: where it goes (`href` and / or `to`), and the anchor's own. */
export type TLinkProps = {
  /** The address in this router's part, e.g. `/level/2?x=1`. */
  href?: string;
  /** Or as a change of the current location (`{ path, query }`). */
  to?: Partial<TUrlProps>;
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
  for (const row of routes) {
    if (!isArray(row) || typeof row[0] !== 'string' || !isObject(row[1])) {
      throw new TypeError(`${WHERE} NavigationHostProvider: a row of "routes" expects [pattern, { … }], got ${describeValue(row)}`);
    }
    if (!options.render && (row[1] as { main?: unknown }).main === undefined) {
      throw new TypeError(`${WHERE} NavigationHostProvider: the row "${row[0]}" has no "main" — give it one, or a "render" that draws the row`);
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
  } = core;
  const h = createElement;
  const primitive = (routerInternal(router) as TRouterInternal).historyPrimitive;

  /** The entry a component is rendered in (inside the host). */
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
          value: entry,
          key: entry.id,
        }, child,
      );
    }

    /** A page by its row; a path no row fits draws nothing ("not found" is a catch-all last row). */
    function drawPage(entry: TPageEntry): unknown {
      return entry.row ? render(
        entry.row, {
          params: entry.params,
          location: entry.location,
        }, entry,
      ) : null;
    }

    function NavigationHost(): unknown {
      const value = useNavigatorState();
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
          }, withEntry(entry, drawPage(entry)),
        );
      });
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
    const entry = useContext(EntryContext) as TEntry | null;
    if (!entry) {
      throw new Error(`${WHERE}: useEntry is used outside a page or a window of the NavigationHost`);
    }
    return entry;
  }

  /** `effect` while this component's entry is open: cleaned up when it starts being left, run again if that's refused. */
  function useWhileOpen(effect: () => void | (() => void)): void {
    const entryId = currentEntry().id;
    const latest = useLatest(effect);
    useEffect(() => whileOpen(entryId, () => latest.current()), []);
  }

  /** `handler` before a page (with `{ windows: true }` — also a window) opens over this component's entry. */
  function useOnForward(handler: TForwardHandler, options?: { windows?: boolean }): void {
    const entryId = currentEntry().id;
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
    const entryId = currentEntry().id;
    const latest = useLatest(guard);
    useEffect(() => onBeforeLeave(entryId, () => latest.current()), []);
  }

  /** Where a link goes: `href` as written (or the current address), changed by `to` when given. */
  function targetOf(props: TLinkProps): TUrlProps {
    const base = urlParse(urlExtend(props.href || router.getLocation().href).href);
    return props.to ? locate(props.to, base) : base;
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
      href: _href,
      to: _to,
      onClick,
      component,
      activeAsParent: _activeAsParent,
      ...anchor
    } = props;
    const target = targetOf(props);
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

  /** A `Link` with `className="active"` while its address is the shown one (`activeAsParent` — or a page under it). */
  function NavLink(props: TLinkProps): unknown {
    const [
      location,
      setLocation,
    ] = useState(router.getLocation);
    useEffect(() => router.$location.watch(setLocation), []);
    const target = targetOf(props);
    const path = location.path;
    const targetPath = target.path || ROOT_PATH;
    const active = path === targetPath || !!props.activeAsParent && path.startsWith(pathPrefix(targetPath));
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
    Link,
    NavLink,
  };
}
