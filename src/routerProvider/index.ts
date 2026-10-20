// The router (fundamentool D-022…D-026): an address model and a stack of pages and windows in step with the
// browser history — see README.md.
import {
  attachEvent,
} from '../attachEvent';
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  childClassOfReact,
} from '../childClassOfReact';
import {
  createTimeout,
} from '../createTimeout';
import {
  describeValue,
} from '../describeValue';
import {
  extend,
} from '../extend';
import {
  isEqual,
} from '../is/isEqual';
import {
  isArray,
} from '../is/isArray';
import {
  isBoolean,
} from '../is/isBoolean';
import {
  isDefined,
} from '../is/isDefined';
import {
  isFunction,
} from '../is/isFunction';
import {
  isNumber,
} from '../is/isNumber';
import {
  isObject,
} from '../is/isObject';
import {
  isString,
} from '../is/isString';
import {
  isMatch,
} from '../is/isMatch';
import {
  noop,
} from '../noop';
import {
  once,
} from '../once';
import {
  keyedRegistry,
} from '../keyedRegistry';
import {
  queueProvider,
} from '../queueProvider';
import {
  routeParseProvider,
} from '../routeParseProvider';
import {
  urlExtend,
} from '../urlExtend';
import {
  urlParse,
} from '../urlParse';
import {
  wait,
} from '../wait';
import {
  withAsyncLock,
} from '../withAsyncLock';
import {
  wrapper,
} from '../wrapper';
import type {
  Observable,
  TObservableAdapter,
} from '../Observable/types';
import type {
  TRouteMapper,
} from '../regexpMapperProvider';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';
import {
  keys,
} from '../keys';

export type {
  TParams,
} from '../unparam';
export type {
  TRouteMapper,
} from '../regexpMapperProvider';
export type {
  TUrlProps,
} from '../urlParse';

/** A component of the injected view library. */
type TElementType = any;
/** Props of an anchor element. */
type TAnchorProps = Record<string, any>;
/** A click event, as much as `Link` uses. */
type TClickEvent = { preventDefault?: () => void } & Record<string, any>;
/** An effect with an optional cleanup (`useEffect`'s shape). */
type TEffectCallback = () => void | (() => void | undefined);
/** A hook's dependency list. */
type TDependencyList = ReadonlyArray<unknown>;

export type TRouteProps = {
  route: TRoute;
  active: boolean;
};
export type TRouteHandler<T> = (params: TParams, location: TUrlProps) => T | undefined | null;
export type TRouteArgs<T> = [string, TRouteHandler<T> | T];
export type TLockWatcherOptions = {
  backwards?: boolean;
  forwards?: boolean;
};
export type TLockWatcherFn = (loc: TUrlProps) => any | Promise<any>;
export type TLockWatcher = TLockWatcherOptions & {
  callback: TLockWatcherFn;
};
export type TAfterReturningCallback = () => void | Promise<void>;
export type TLocationNavigationOptions = {
  /** The transition state (`$location`, `$path`, …) doesn't follow this step. */
  quiet?: boolean;
  /** Going back: don't ask the leave confirmations of the entries left (sign out, a forced return to the start). */
  force?: boolean;
};
export type TLocationOptions = TLocationNavigationOptions & {
  onBeforeUnload?: TLockWatcherFn | TLockWatcher | null;
};

export type TLinkProps = {
  options?: Partial<TUrlProps>;
  onClick?: (event: TClickEvent) => void | boolean | Promise<void | boolean>;
  timeout?: number;
  active?: boolean;
  activeAsParent?: boolean;
  component?: TElementType;
} & TAnchorProps;

export type TPushLocation = (
  extendsLocation: Partial<TUrlProps>,
  options?: TLocationOptions,
) => Promise<TUrlProps>;

/**
 * What the app tells the router about a page (the router knows no routes for this): whether it stays mounted when
 * covered, its section (tab), whether it is that section's main page, whether opening it starts the history over.
 */
export type TPageInfo = {
  /** Keep the page mounted (hidden) while other pages cover it — it returns with its scroll and state. */
  keep?: boolean;
  /** The section (tab) the page belongs to. */
  section?: string;
  /** The page a section opens with — `backToSection` returns here. */
  sectionHome?: boolean;
  /** Opening this page drops everything before it ("start over"). */
  startsOver?: boolean;
};

/** A page in the stack: its whole address and what `describe` said about it. */
export type TPageEntry = {
  kind: 'page';
  id: number;
  depth: number;
  location: TUrlProps;
  info: TPageInfo;
};

/** A window in the stack: what to render and with what. */
export type TWindowEntry = {
  kind: 'window';
  id: number;
  depth: number;
  window: unknown;
  params: unknown;
  /** `false`: the browser's Forward doesn't reopen it after it was closed (D-024). */
  reopen: boolean;
};

export type TEntry = TPageEntry | TWindowEntry;

/** Options of `router.open`. */
export type TOpenOptions = {
  /** Reopen the window when the player goes Forward after closing it (default `true`; `false` for confirmations). */
  reopen?: boolean;
};

/** Options of `router.leavePage`. */
export type TLeavePageOptions = {
  /** Where to go when the history has no earlier page of the app (for `hashRouterProvider` — the hash part). */
  fallback: Partial<TUrlProps>;
};

/** What a window renders with: its params, whether it is open (false while it plays its exit), how to close it. */
export type TWindowProps<P = unknown, R = unknown> = {
  params: P;
  open: boolean;
  close: (result?: R) => void;
};

/** Runs when something opens over an entry: `false` cancels; a returned function runs when the entry is on top again. */
export type TForwardHandler = () => void | false | (() => void) | Promise<void | false | (() => void)>;

/** Asked before an entry is left by going back; `false` keeps it. */
export type TLeaveGuard = () => boolean | Promise<boolean>;

/** The router's state: the address model (`location`, `prev`, `history`) and the stack of pages and windows. */
export type TRouterState = {
  /** The top entry's index (windows count: each is a history entry). */
  depth: number;
  /** The page under the top entry. */
  prev: null | TUrlProps;
  /** The shown page's address (a window keeps the address of the page it opens over). */
  location: TUrlProps;
  /** Each entry's address, bottom to top. */
  history: (TUrlProps | null)[];
  /** Pages and windows, bottom to top; `entries[i].depth === i`. */
  entries: readonly TEntry[];
  /** Windows just closed — still rendered (closed) while they play their exit. */
  leaving: readonly TWindowEntry[];
  /** Entries left by going back that the browser's Forward brings back, nearest first. */
  ahead: readonly TEntry[];
  /** Mounted page layers of every section (the shown page and the kept ones), in creation order. */
  layers: readonly TPageEntry[];
  /** The shown page. */
  page: TPageEntry;
  /** The section lit in the tab bar. */
  section: string | null;
};

export type TRoute = {
  index: number;
  params: TParams;
} & TRouterState &
  Record<string, any>;

export type TBackLocationResponse = {
  locked: boolean;
};

/**
 * The router's options besides its dependencies: how pages behave in the stack.
 */
export type TRouterOptions = {
  /**
   * What a page is: kept mounted when covered (`keep`), its section, a section's main page, a page that starts the
   * history over. Gets the page's location (for `hashRouterProvider` — the hash part). Default: nothing special.
   */
  describe?: (location: TUrlProps) => TPageInfo;
  /** Sections → their main page's address (`{ home: '/', notes: '/notes' }`); the first is the start section. */
  sections?: Readonly<Record<string, string>>;
  /** `separate` — each section keeps its own history; tapping the shown section returns to its main page. */
  sectionHistory?: 'shared' | 'separate';
  /** How many covered pages stay mounted at most (default 10). */
  keep?: number;
  /** How long a closed window plays its exit, ms (default 300). */
  exitMs?: number;
};

/**
 * The router's dependencies: the window, the view library (React, Preact, …) and the observable adapter — injected,
 * so the router works with any of them — plus {@link TRouterOptions}. `useState`, `useRef`, `createContext`,
 * `useContext` are needed only by `router.NavigationHostProvider`.
 */
export type TRouterProviderDeps = TObservableAdapter & TRouterOptions & {
  window: Window;
  Component: TElementType;
  useEffect: (...args: any[]) => void;
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
  useState?: (...args: any[]) => any;
  useRef?: (...args: any[]) => any;
  createContext?: (...args: any[]) => any;
  useContext?: (...args: any[]) => any;
};

/** What `router.NavigationHostProvider`'s host renders with. */
export type TNavigationHostOptions = {
  /** The page for an entry; `location` is its address (for `hashRouterProvider` — the hash part). */
  renderPage: (entry: TPageEntry, location: TUrlProps) => unknown;
  /** A window entry → its element (`entry.window` is what was passed to `open`, usually a component). */
  renderWindow: (entry: TWindowEntry, props: TWindowProps) => unknown;
};

/** What the router writes into `history.state`: whose entry it is, how deep, which entry (Forward checks it). */
type TOurState = {
  nav: string;
  depth: number;
  id: number;
};

/** How a step back ended: `left` settles `true` when the entries were left, `false` when a guard kept them. */
type TOutcome = {
  left: Promise<boolean>;
};

/** An effect registered with `whileOpen`, and the cleanup it returned last. */
type TOpenedEffect = {
  effect: () => void | (() => void);
  cleanup: (() => void) | void;
};

/** A forward handler and whether windows trigger it too. */
type TForwardItem = {
  handler: TForwardHandler;
  windows: boolean;
};

/** What the hooks and the view need from the router's stack. */
type TRouterCore = {
  /** The router's state. */
  $state: Observable<TRouterState>;
  /** The entries now, bottom to top. */
  entries: () => readonly TEntry[];
  /** The location a page renders with: the hash part for the hash router. */
  own: (location: TUrlProps) => TUrlProps;
  close: (entryId: number, result?: unknown) => Promise<void>;
  whileOpen: (entryId: number, effect: () => void | (() => void)) => () => void;
  onForward: (entryId: number, handler: TForwardHandler, options?: { windows?: boolean }) => () => void;
  onBeforeLeave: (entryId: number, guard: TLeaveGuard) => () => void;
};

/** The kinds of the stack's entries (`TEntry['kind']`). */
const PAGE = 'page';
const WINDOW = 'window';

/** The section-history modes (`sectionHistory`). */
const SHARED = 'shared';
const SEPARATE = 'separate';

/** The phases the opened-entry effects run in (`runOpened`). */
const CLOSE = 'close';
const REOPEN = 'reopen';

/** An empty query, shared (never mutated). */
const NOOP_OBJECT: TParams = {};

/** The `…Throttled` steps: calls within 300 ms of an accepted one (or while it runs) are ignored — a double tap. */
const THROTTLE = {
  minMs: 300,
};

/**
 * The default lock watcher options.
 *
 * @type {Object}
 * @property {boolean} forwards - Whether to watch forwards.
 * @property {boolean} backwards - Whether to watch backwards.
 */
export const DEFAULT_LOCK_WATCHER_OPTIONS = {
  forwards: false,
  backwards: true,
};

/** The single list of accepted keys of the router's dependencies — checked against the type in tests. */
export const ROUTER_DEPS_KEYS = [
  'window',
  'Component',
  'useEffect',
  'createElement',
  'forwardRef',
  'useState',
  'useRef',
  'createContext',
  'useContext',
  'createObservable',
  'createApi',
  'describe',
  'sections',
  'sectionHistory',
  'keep',
  'exitMs',
] as const;

/** The single list of accepted keys of {@link TOpenOptions}. */
export const OPEN_OPTION_KEYS = ['reopen'] as const;

/** The single list of accepted keys of {@link TLeavePageOptions}. */
export const LEAVE_PAGE_OPTION_KEYS = ['fallback'] as const;

/** The single list of accepted keys of {@link TNavigationHostOptions}. */
export const NAVIGATION_HOST_OPTION_KEYS = ['renderPage', 'renderWindow'] as const;

/** What `router.NavigationHostProvider` needs from the view library. */
const NAVIGATION_HOST_DEPS = [
  'createElement',
  'useEffect',
  'useState',
  'useRef',
  'createContext',
  'useContext',
] as const;

const ROUTER_WHERE = '[fundamentool] routerProvider';

/** How a step back ended: the entries were left. */
const LEFT: TOutcome = {
  left: Promise.resolve(true),
};

/** How a step back ended: a guard kept the entries (or there was nothing to leave). */
const STAYED: TOutcome = {
  left: Promise.resolve(false),
};

/** A page layer: its own scroll container (keeps its scroll under `display: none` — research 02 §6.1). */
const LAYER = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
};

/** "What was expected, what came" for one option. */
function invalid(
  key: string, expected: string, value: unknown,
): TypeError {
  return new TypeError(`${ROUTER_WHERE}: "${key}" expects ${expected}, got ${describeValue(value)}`);
}

/** Checks the dependencies once, at creation (lab convention `api-input-validation.md`). */
function assertRouterDeps(deps: unknown): asserts deps is TRouterProviderDeps {
  if (!isObject(deps) || isArray(deps)) {
    throw new TypeError(`${ROUTER_WHERE}: expects a dependencies object, got ${describeValue(deps)}`);
  }
  assertKnownOptions(
    ROUTER_WHERE, deps, ROUTER_DEPS_KEYS,
  );
  const raw = deps as Record<string, unknown>;
  const win = raw.window as Window | null;
  if (!isObject(win) || !isFunction(win.history?.pushState)) {
    throw invalid(
      'window', 'a browser window', win,
    );
  }
  let key: string;
  let value: unknown;
  for (key of [
    'useEffect',
    'createElement',
    'forwardRef',
    'createObservable',
    'createApi',
  ] as const) {
    value = raw[key];
    if (!isFunction(value)) {
      throw invalid(
        key, 'a function', value,
      );
    }
  }
  const describe = raw.describe;
  if (isDefined(describe) && !isFunction(describe)) {
    throw invalid(
      'describe', 'a function (location) => page info', describe,
    );
  }
  const sections = raw.sections;
  if (isDefined(sections) && (!isObject(sections) || isArray(sections) || !Object.values(sections).every(isString))) {
    throw invalid(
      'sections', 'an object section → main page path', sections,
    );
  }
  for (key of ['keep', 'exitMs']) {
    value = raw[key];
    if (isDefined(value) && !(isNumber(value) && value >= 0 && Number.isFinite(value))) {
      throw invalid(
        key, 'a number ≥ 0', value,
      );
    }
  }
  const sectionHistory = raw.sectionHistory;
  if (isDefined(sectionHistory) && sectionHistory !== SHARED && sectionHistory !== SEPARATE) {
    throw invalid(
      'sectionHistory', '"shared" or "separate"', sectionHistory,
    );
  }
  if (sectionHistory === SEPARATE && !(sections && keys(sections).length)) {
    throw invalid(
      'sectionHistory', '`sections` beside "separate"', sectionHistory,
    );
  }
}

/** Checks `open`'s options (cold path: once per window). */
function assertOpenOptions(options: unknown): asserts options is TOpenOptions | undefined {
  if (!isDefined(options)) {
    return;
  }
  if (!isObject(options) || isArray(options)) {
    throw new TypeError(`${ROUTER_WHERE} open: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    `${ROUTER_WHERE} open`, options, OPEN_OPTION_KEYS,
  );
  const reopen = (options as TOpenOptions).reopen;
  if (isDefined(reopen) && !isBoolean(reopen)) {
    throw invalid(
      'reopen', 'a boolean', reopen,
    );
  }
}

/**
 * Merges two URL properties.
 *
 * @param prev - The previous URL properties.
 * @param extend - The extended URL properties.
 * @returns The merged URL properties.
 * @example
 * mergeLocation({ path: '/user', query: { id: 1 } }, { path: '/user/1', query: { name: 'John' } }); // => { path: '/user/1', query: { id: 1, name: 'John' } }
 */
export function mergeLocation(prev: Partial<TUrlProps>, exten: Partial<TUrlProps>) {
  const child: Partial<TUrlProps> = exten.child || {};
  const prevChild: Partial<TUrlProps> = prev.child || {};
  return urlExtend(exten.path || prev.path, {
    query: exten.query || null,
    child: urlExtend(child.path || prevChild.path, {
      query: child.query || null,
    }),
  });
}

/**
 * Gets the path from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The path.
 * @example
 * getPath({ path: '/user' }); // => '/user'
 */
function getPath(v: Partial<TUrlProps>) {
  return v.path || '';
}

/**
 * Gets the child from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The child.
 * @example
 * getChild({ child: { path: '/user' } }); // => { path: '/user' }
 */
function getChild(v: Partial<TUrlProps>): TUrlProps {
  return urlExtend(v.child);
}

/**
 * Gets the query from a URL properties.
 *
 * @param v - The URL properties.
 * @returns The query.
 * @example
 * getQuery({ query: { id: 1 } }); // => { id: 1 }
 */
function getQuery(v: Partial<TUrlProps>): TParams {
  return v.query || NOOP_OBJECT;
}

/**
 * Creates a router for an observable map.
 *
 * @param _routes - The routes.
 * @param notFoundHandler - The not found handler.
 * @returns A router.
 * @example
 * routerForObservableMapProvider([['/user', (params, location) => <User />]], (params, location) => <NotFound />); // => <Router />
 */
export function routerForObservableMapProvider<T>(_routes: TRouteArgs<T>[],
  notFoundHandler?: TRouteHandler<T>) {
  const routes: [TRouteMapper, TRouteHandler<T>][] = _routes.map(([route, render]) => {
    // `-` and `_` match each other in the plain part of a route, before its first group — never inside the group.
    let scopePos = route.indexOf('(');
    const length = route.length;
    if (scopePos < 0) {
      scopePos = length;
    }

    const handler = (isFunction(render) ? render : wrapper(render)) as TRouteHandler<T>;

    return [routeParseProvider(route.slice(0, scopePos).replace(/[-_]/gim, '[-_]') + route.slice(scopePos, length)), handler];
  });
  return (state: TRouterState): T & TRoute => {
    const {
      location,
    } = state;
    const path = location.path || '';
    const length = routes.length;
    let i = 0,
      params: TParams = {},
      result: any,
      route: [TRouteMapper, TRouteHandler<T>];
    for (; i < length; i++) {
      route = routes[i];
      if (route[0](path, (params = {})) && (result = route[1](params, location))) {
        break;
      }
    }

    if (!result && notFoundHandler) {
      result = notFoundHandler(params, location);
    }

    return {
      ...state,
      index: i,
      params,
      location,
      ...(result || {}),
    };
  };
}

/**
 * Creates a router for a location.
 *
 * @param $state - The state.
 * @returns A router.
 * @example
 * routerByLocationProviderProvider($state); // => <Router />
 */
export function routerByLocationProviderProvider<A extends TRouterState>($state: Observable<A>) {
  return function routerByLocationProvider<T>(routes: TRouteArgs<T>[],
    notFoundHandler?: TRouteHandler<T>) {
    return $state.map(routerForObservableMapProvider(routes, notFoundHandler));
  };
}

/**
 * `Link` components of one router: an anchor that pushes its address on click. One click at a time across the router's
 * links (a double tap doesn't push twice).
 */
function createLinkProvider({
  createElement,
  forwardRef,
}: Pick<TRouterProviderDeps, 'createElement' | 'forwardRef'>) {
  /** One click at a time across the router's links; released however the click ends. */
  const click = withAsyncLock(async (
    e: TClickEvent, onClick: (event: TClickEvent) => unknown, url: string, options: TUrlProps, pushLocation: TPushLocation,
    timeout: number,
  ) => {
    if (timeout) {
      await wait(timeout);
    }
    // `false` from the link's own handler cancels the step.
    if ((await onClick(e)) !== false && url) {
      await pushLocation(options);
    }
  });
  return function LinkProvider({
    pushLocation,
    hasHash,
  }: {
    pushLocation: TPushLocation;
    hasHash?: boolean | number;
  }): TElementType {
    return forwardRef((props: TLinkProps, ref: any) => {
      const {
        options: _originOptions,
        component,
        timeout,
        activeAsParent,
        active,
        ...addition
      } = props;

      const onClick: any = props.onClick || noop;
      const options = urlExtend(props.href, _originOptions);
      const url = options.href;

      addition.href = url ? (hasHash ? `#${url}` : url) : undefined;
      addition.ref = ref;
      addition.onClick = async (e: TClickEvent) => {
        e.preventDefault && e.preventDefault();
        if (!active) {
          await click(
            e, onClick, url, options, pushLocation, timeout || 0,
          );
        }
        return false;
      };

      return createElement(component || 'a',
        addition);
    });
  };
}

/** `NavLink` components of one router: a `Link` marked `active` while its address is the current one. */
function createNavLinkProvider({
  Component,
  createElement,
}: Pick<TRouterProviderDeps, 'Component' | 'createElement'>) {
  return function NavLinkProvider(Link: TElementType, $location: Observable<any>): TElementType {
    return childClassOfReact(Component, (self) => {
      let subscription: (() => any) | 0;
      const setState = self.setState.bind(self);
      const initial = $location.getState();
      self.state = initial;
      // Subscribes once mounted (`componentWillMount` is deprecated) and catches up with a change made in between.
      self.componentDidMount = () => {
        subscription || (subscription = $location.watch(setState));
        const now = $location.getState();
        now === initial || setState(now);
      };
      self.componentWillUnmount = () => {
      subscription && (subscription(), subscription = 0); // eslint-disable-line
      };
      self.render = () => {
        const props = extend({}, self.props);
        const forwardedRef = props.forwardedRef;
        const {
          state,
        } = self;
        const path = state.path || '/';
        const matchs = urlExtend(props.href, props.options);
        const targetPath = matchs.path;
        // A page without a query has `query` undefined — it still matches a link without one.
        const hasActive = path === targetPath && isMatch(state.query || {}, matchs.query);

        if (forwardedRef) {
          delete props.forwardedRef;
          props.ref = forwardedRef;
        }

        if (
          hasActive ||
        (props.activeAsParent &&
          path.startsWith(targetPath.slice(-1) === '/' ? targetPath : targetPath + '/'))
        ) {
          props.active = hasActive;
          props.className = 'active ' + (props.className || '');
        }

        return createElement(Link, props);
      };
    }) as any;
  };
}

/**
 * Param storages of one router: the query's keys as a key-value store (`set` / `get` / `remove`, a change event per
 * key). The storages of a router share one lock, so a change one of them makes isn't echoed back to it.
 */
function createParamStorageProvider({
  createObservable,
  createApi,
}: Pick<TRouterProviderDeps, 'createObservable' | 'createApi'>) {
  let _locked = 0;
  return function paramStorageProvider($query: Observable<TParams>, pushLocation: TPushLocation) {
    const $params = createObservable({});
    const {
      emit,
    } = createApi($params, {
      emit: (_, payload: Record<string, any>) => payload,
    });

    let state = $query.getState();

    const instance = {
      set,
      get: (key: string) => state[key],
      remove: (key: string) => set(key),
      getKeys: () => keys(state),
      clear: () => {
        setState({});
        return instance;
      },
      watch: (watcher: (state: Record<string, any>) => any) => $params.watch(watcher),
    };

    function setState(query: Record<string, any>) {
      _locked = 1;
      pushLocation({
        query,
      });
      changeState(query);
      _locked = 0;
    }
    function set(key: string, v?: any) {
      if (!isEqual(v, state[key])) {
        const nextState: Record<string, any> = {
          ...state,
        };
        nextState[key] = v;
        setState(nextState);
      }
      return instance;
    }
    function changeState(nextState: Record<string, any>) {
      const prev = state;
      const exclude: Record<string, any> = {};
      const changed: Record<string, any> = {};
      let v: any, k: string;
      state = nextState;
    for (k in state) { // eslint-disable-line
        exclude[k] = 1;
        isEqual(prev[k], (v = state[k])) || (changed[k] = v);
      }
      for (k in prev) {
        exclude[k] || isEqual(prev[k], (v = state[k])) || (changed[k] = v);
      }
      for (k in changed) {
        emit({
          key: k,
          value: changed[k],
        });
      }
    }
    $query.watch((state) => {
      _locked || changeState(state || {});
    });
    return instance;
  };
}

/**
 * The router's hooks and its view, over its stack (`core`) and the injected view library (`deps`). Outside the view's
 * host a hook belongs to the top entry at render (the old `useRouteIsFocus` use).
 */
function createRouterView(deps: TRouterProviderDeps, core: TRouterCore) {
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
  const EntryContext = createContext ? createContext(null) : null;

  /** The entry a component belongs to: the one it is rendered in, or (outside the host) the top entry at render. */
  function currentEntry(): TEntry {
    const entry = EntryContext && useContext ? useContext(EntryContext) as TEntry | null : null;
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
    const ref = (useRef as NonNullable<TRouterProviderDeps['useRef']>)(value);
    ref.current = value;
    return ref;
  }

  /** The router's state, re-rendering on change. */
  function useRouterState(): TRouterState {
    const [value, setValue] = (useState as NonNullable<TRouterProviderDeps['useState']>)($state.getState);
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
    const missing = NAVIGATION_HOST_DEPS.filter((key) => !isFunction(deps[key]));
    if (missing.length) {
      throw new TypeError(`${ROUTER_WHERE} NavigationHostProvider: the dependencies lack ${missing.join(', ')} (from React, or preact + preact/hooks)`);
    }
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
      const layers = value.layers.map((entry) => h(
        'div', {
          key: entry.id,
          'data-nav-layer': entry.depth,
          'aria-hidden': entry === value.page ? undefined : 'true',
          style: {
            ...LAYER,
            display: entry === value.page ? 'block' : 'none',
          },
        }, withEntry(entry, renderPage(entry, own(entry.location))),
      ));
      const shownWindows = value.entries.filter((entry): entry is TWindowEntry => entry.kind === WINDOW);
      const windows = [...shownWindows, ...value.leaving].map((entry) => withEntry(entry, renderWindow(entry, {
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
    const entry = EntryContext && useContext ? useContext(EntryContext) as TEntry | null : null;
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

/**
 * The router (fundamentool D-022, D-025): an address model (path, query, the hash part as a child location) and a
 * stack of pages and windows in step with the browser history — every page and every window is a history entry, so
 * back (browser, Android, Escape) closes the top one; Forward brings back what back left (D-024); covered pages can
 * stay mounted; sections keep their own history. `hash` — the hash part is the location (`hashRouterProvider`).
 */
function routerProviderBase(deps: TRouterProviderDeps, hash: boolean) {
  assertRouterDeps(deps);
  const {
    window,
    createObservable,
    createApi,
  } = deps;
  // The history's methods, bound once: native methods need `this === history`, and the router calls them often (D-035).
  const history = window.history;
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  const historyGo = history.go.bind(history);
  const describePage = deps.describe;
  const keepLimit = deps.keep ?? 10;
  const exitMs = deps.exitMs ?? 300;
  const separate = deps.sectionHistory === SEPARATE;
  const session = Math.random().toString(36).slice(2);

  /** The location a page describes itself by and renders with: the hash part for the hash router. */
  const own = (location: TUrlProps): TUrlProps => (hash ? getChild(location) : location);
  const describeLocation = (location: TUrlProps): TPageInfo => (describePage ? describePage(own(location)) ?? {} : {});

  const start = urlParse(window.location.href);
  /** Sections → their main page's whole address (for the hash router the section path goes after `#`). */
  const sections: Record<string, TUrlProps> = {};
  for (const [name, path] of Object.entries(deps.sections ?? {})) {
    sections[name] = hash ? mergeLocation(start, {
      child: urlParse(path),
    }) : urlParse(path);
  }
  const homeSection = keys(sections)[0];

  // ── the stack ─────────────────────────────────────────────────────────────────────────────────────────────────

  let nextId = 1;
  let entries: TEntry[] = [];
  let leaving: TWindowEntry[] = [];
  /** Entries left by going back, nearest first — what the browser's Forward restores (D-024). */
  let ahead: TEntry[] = [];
  /** `separate`: each section's own stack, and the section shown. */
  const stacks = new Map<string, TEntry[]>();
  let shown = homeSection;

  /** Window results and resolvers, by entry id. */
  const results = new Map<number, unknown>();
  const resolvers = new Map<number, (result: unknown) => void>();
  /** Effects running while their entry is open. */
  const opened = keyedRegistry<number, TOpenedEffect>();
  /** Asked before something opens over the entry. */
  const forward = keyedRegistry<number, TForwardItem>();
  /** Asked before the entry is left by going back. */
  const guards = keyedRegistry<number, TLeaveGuard>();
  /** Cleanups returned by forward handlers — run when their entry is on top again. */
  const returns = keyedRegistry<number, () => void>();
  /** Entries being left while their guards are asked. */
  const closing = new Set<number>();

  /**
   * A page entry. Its location is read from its address — after a push exactly what a reload gives (`'3'` → `3`,
   * D-028), whatever object the caller built.
   */
  function page(target: TUrlProps, depth: number): TPageEntry {
    const location = urlParse(target.href);
    return {
      kind: PAGE,
      id: nextId++,
      depth,
      location,
      info: describeLocation(location),
    };
  }

  function topPage(list: readonly TEntry[]): TPageEntry {
    return pageAt(list, list.length - 1);
  }

  /** The page an entry belongs to: itself, or the page under a window. */
  function pageAt(list: readonly TEntry[], index: number): TPageEntry {
    for (let i = index; i >= 0; i--) {
      if (list[i].kind === PAGE) {
        return list[i] as TPageEntry;
      }
    }
    /* istanbul ignore next -- the bottom entry is always a page */
    throw new Error('routerProvider: no page in the stack');
  }

  // ── state ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /** A quiet push: the address changes, the observables don't. */
  let _quiet = false;
  /** Going back several steps: the transition state follows only at the end. */
  let _quietTransition = false;
  let _fromLocation: TUrlProps | null = null;

  /** The stack as the state: what `$state` holds after every change (unless the change is quiet). */
  function compute(): TRouterState {
    if (separate) {
      stacks.set(shown, shown === homeSection ? entries : entries.slice(1));
    }
    const top = topPage(entries);
    const mounted = new Set<number>([top.id]);
    const layers: TPageEntry[] = [top];
    let kept = 0;
    let section: string | null = separate ? shown : null;
    // The shown stack first (most recent first), then the other sections' stacks.
    const lists = [entries, ...[...stacks].filter(([name]) => name !== shown).map(([, list]) => list)];
    for (const list of lists) {
      for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
        if (entry.kind !== PAGE) {
          continue;
        }
        if (!separate && list === entries) {
          section ??= entry.info.section ?? null;
        }
        if (!mounted.has(entry.id) && entry.info.keep && kept < keepLimit) {
          mounted.add(entry.id);
          layers.push(entry);
          kept++;
        }
      }
    }
    layers.sort((a, b) => a.id - b.id);
    const depth = entries.length - 1;
    return {
      depth,
      prev: depth > 0 ? pageAt(entries, depth - 1).location : null,
      location: top.location,
      history: entries.map((_, index) => pageAt(entries, index).location),
      entries,
      leaving,
      ahead,
      layers,
      page: top,
      section,
    };
  }

  let state: TRouterState = {
    depth: 0,
    prev: null,
    location: start,
    history: [start],
    entries: [],
    leaving: [],
    ahead: [],
    layers: [],
    page: null as unknown as TPageEntry,
    section: null,
  };

  const $state = createObservable<TRouterState>(state);
  const {
    emitState,
  } = createApi($state, {
    emitState: (_, payload: TRouterState) => payload,
  });

  /** The transition state: follows `$state`, except during a quiet or multi-step back (it catches up at the end). */
  const $transitionState = createObservable<TRouterState>(state);
  const {
    emitTransition,
  } = createApi($transitionState, {
    emitTransition: (_, payload: TRouterState) => payload,
  });

  function publish(): void {
    const prevPage = state.page;
    state = compute();
    if (prevPage && state.page !== prevPage) {
      _fromLocation = prevPage.location;
    }
    if (_quiet) {
      return;
    }
    emitState(state);
    _quietTransition || immediateTransition();
  }

  function immediateTransition() {
    emitTransition($state.getState());
  }

  // ── sections (`separate`) ─────────────────────────────────────────────────────────────────────────────────────

  /** The section a location belongs to (unknown → the first section). */
  function sectionOf(location: TUrlProps): string {
    const section = describeLocation(location).section;
    return isDefined(section) && section in sections ? section : homeSection;
  }

  /** What the browser history holds for a section — the first section's main page under it, then its stack. */
  function layout(section: string): TEntry[] {
    if (!stacks.has(homeSection)) {
      stacks.set(homeSection, [page(sections[homeSection], 0)]);
    }
    const list = section === homeSection
      ? stacks.get(homeSection) as TEntry[]
      : [(stacks.get(homeSection) as TEntry[])[0], ...(stacks.get(section) as TEntry[])];
    return list.map((entry, depth) => (entry.depth === depth ? entry : {
      ...entry,
      depth,
    }));
  }

  /** The browser is at its first entry — write a section's stack into the history and show it. */
  function rebuild(section: string): void {
    const list = layout(section);
    replaceState(
      mark(list[0]), '', hrefOf(list[0]),
    );
    for (let i = 1; i < list.length; i++) {
      pushState(
        mark(list[i]), '', hrefOf(list[i]),
      );
    }
    entries = list;
    ahead = [];
    shown = section;
    publish();
  }

  /** Windows can't wait in a hidden stack: those of the shown stack close (resolve `null`) before a switch. */
  function dropWindows(): void {
    const first = entries.findIndex((entry) => entry.kind === WINDOW);
    if (first < 0) {
      return;
    }
    const windows = entries.slice(first) as TWindowEntry[];
    ahead = [];
    runOpened(windows, CLOSE);
    entries = entries.slice(0, first);
    for (const entry of windows) {
      forget(entry);
      resolve(entry, null);
    }
  }

  // ── the browser history ───────────────────────────────────────────────────────────────────────────────────────

  /** The state written into the browser entry of `entry`. */
  function mark(entry: TEntry): TOurState {
    return {
      nav: session,
      depth: entry.depth,
      id: entry.id,
    };
  }

  /** An entry's address: a page's own; a window keeps the address of the page under it. */
  function hrefOf(entry: TEntry): string {
    return (entry.kind === PAGE ? entry.location : topPage(entries).location).href;
  }

  function isOurs(value: unknown): value is TOurState {
    return isObject(value) && (value as TOurState).nav === session && isNumber((value as TOurState).depth);
  }

  /** A travel we started: the next history event is its answer, not the player's. */
  let waiter: ((value: unknown) => void) | null = null;

  function travel(delta: number): Promise<unknown> {
    return new Promise((done) => {
      waiter = done;
      historyGo(delta);
    });
  }

  /** One navigation step at a time, in call order (fundamentool's `queueProvider`). */
  const queue = queueProvider()((work: () => unknown) => work());
  const enqueue = <T>(work: () => Promise<T> | T): Promise<T> => queue(work) as Promise<T>;

  // ── stack changes ─────────────────────────────────────────────────────────────────────────────────────────────

  function runOpened(list: readonly TEntry[], phase: 'close' | 'reopen'): void {
    for (let i = list.length - 1; i >= 0; i--) {
      for (const item of opened.list(list[i].id)) {
        if (phase === CLOSE) {
          const cleanup = item.cleanup;
          item.cleanup = undefined;
          isFunction(cleanup) && cleanup();
        } else {
          item.cleanup = item.effect();
        }
      }
    }
  }

  function forget(entry: TEntry): void {
    closing.delete(entry.id);
    opened.forget(entry.id);
    forward.forget(entry.id);
    guards.forget(entry.id);
    returns.forget(entry.id);
  }

  /** Settles a window's promise: with its result if it closed with one, otherwise `result`. */
  function resolve(entry: TWindowEntry, result: unknown): void {
    const value = results.has(entry.id) ? results.get(entry.id) : result;
    results.delete(entry.id);
    resolvers.get(entry.id)?.(value);
    resolvers.delete(entry.id);
  }

  /** Removes every entry above `depth`: windows resolve and play their exit; the new top's return cleanups run. */
  function removeAbove(depth: number): void {
    const removed = entries.slice(depth + 1);
    entries = entries.slice(0, depth + 1);
    // What was left goes ahead (Forward brings it back), up to a window that isn't reopened (D-024).
    const stop = removed.findIndex((entry) => entry.kind === WINDOW && !entry.reopen);
    ahead = stop < 0 ? [...removed, ...ahead] : removed.slice(0, stop);
    const windows = removed.filter((entry): entry is TWindowEntry => entry.kind === WINDOW);
    for (const entry of removed) {
      forget(entry);
    }
    leaving = [...leaving, ...windows];
    const top = entries[entries.length - 1];
    const back = returns.list(top.id);
    returns.forget(top.id);
    publish();
    for (const entry of windows) {
      resolve(entry, null);
    }
    back.forEach((cleanup) => cleanup());
    if (windows.length) {
      createTimeout(() => {
        leaving = leaving.filter((entry) => !windows.includes(entry));
        publish();
      }, exitMs);
    }
  }

  /**
   * The browser is now at `value` — make the stack match. Going back past entries with leave guards: step forward
   * again, ask the guards (they may open windows, so outside the queue), and leave as far as they agree. `force` —
   * the guards aren't asked.
   */
  async function settle(value: unknown, force = false): Promise<TOutcome> {
    const current = entries.length - 1;
    if (!isOurs(value)) {
      reset(urlParse(window.location.href));
      return LEFT;
    }
    const target = value.depth;
    if (target > current) {
      return forwardTo(target, value.id);
    }
    /* istanbul ignore next -- a browser never reports the entry it is already on (history.go(0) reloads) */
    if (target === current) {
      return STAYED;
    }
    if (separate && target === 0 && shown !== homeSection) {
      // Back past a section's main page: that section keeps its main page, the first section is shown.
      const removed = entries.slice(2);
      runOpened(removed, CLOSE);
      if (!force && removed.some((entry) => guards.has(entry.id))) {
        await travel(current);
        return {
          left: confirmLeave(1, removed),
        };
      }
      removeAbove(1);
      rebuild(homeSection);
      return LEFT;
    }
    const removed = entries.slice(target + 1);
    runOpened(removed, CLOSE);
    if (force || !removed.some((entry) => guards.has(entry.id))) {
      removeAbove(target);
      return LEFT;
    }
    await travel(current - target);
    // Asked outside the queue (a guard may open a window); the caller may wait for the answer through `left`.
    return {
      left: confirmLeave(target, removed),
    };
  }

  /**
   * Asks the guards of `removed`, top entry first. All agree — go to `target`. One refuses — stop at its entry: what
   * was above it is left, it and what is below stay (their `whileOpen` effects run again).
   */
  async function confirmLeave(target: number, removed: readonly TEntry[]): Promise<boolean> {
    for (const entry of removed) {
      closing.add(entry.id);
    }
    let stop = target;
    for (let i = removed.length - 1; i >= 0 && stop === target; i--) {
      for (const guard of guards.list(removed[i].id)) {
        if (!(await guard())) {
          stop = removed[i].depth;
          break;
        }
      }
    }
    for (const entry of removed) {
      closing.delete(entry.id);
    }
    runOpened(removed.filter((entry) => entry.depth <= stop), REOPEN);
    return enqueue(async () => {
      const current = entries.length - 1;
      if (current <= stop) {
        return false; // the stack changed while the guards were asked: nothing more to leave
      }
      await travel(stop - current);
      removeAbove(stop);
      return stop === target;
    });
  }

  /**
   * The browser went Forward to `target` (D-024): the entries ahead come back — pages with their address, windows
   * reopened (nobody awaits them). Not what we keep ahead (a window that isn't reopened) — undone. Forward handlers of
   * the current top are asked first (outside the queue: they may open windows).
   */
  async function forwardTo(target: number, id: number): Promise<TOutcome> {
    const current = entries.length - 1;
    const count = target - current;
    const restore = ahead.slice(0, count);
    if (restore.length < count || restore[count - 1].id !== id) {
      await travel(current - target);
      return STAYED;
    }
    const kind = restore[0].kind;
    if (!hasForward(kind)) {
      restoreAhead(restore);
      return LEFT;
    }
    await travel(current - target);
    void askForward(kind).then((go) => (go ? enqueue(async () => {
      if (entries.length - 1 === current && ahead[count - 1] === restore[count - 1]) {
        await travel(count);
        restoreAhead(restore);
      }
    }) : undefined));
    return STAYED;
  }

  function restoreAhead(restore: readonly TEntry[]): void {
    ahead = ahead.slice(restore.length);
    const ids = new Set(restore.map((entry) => entry.id));
    leaving = leaving.filter((entry) => !ids.has(entry.id));
    entries = [...entries, ...restore];
    publish();
  }

  function reset(location: TUrlProps): void {
    const all = [...entries, ...[...stacks].filter(([name]) => name !== shown).flatMap(([, list]) => list)];
    runOpened(entries, CLOSE);
    stacks.clear();
    if (separate) {
      shown = sectionOf(location);
      stacks.set(shown, [page(location, 0)]);
      entries = layout(shown);
      replaceState(
        mark(entries[0]), '', hrefOf(entries[0]),
      );
      if (entries.length > 1) {
        pushState(
          mark(entries[1]), '', location.href,
        );
      }
    } else {
      entries = [page(location, 0)];
      replaceState(
        mark(entries[0]), '', location.href,
      );
    }
    ahead = [];
    for (const entry of all) {
      forget(entry);
      entry.kind === WINDOW && resolve(entry, null);
    }
    publish();
  }

  /** Does the top entry have forward handlers for this kind of step? */
  function hasForward(kind: 'page' | 'window'): boolean {
    return forward.list(entries[entries.length - 1].id).some((item) => kind === PAGE || item.windows);
  }

  /** Asks the forward handlers of the top entry; `false` — cancelled. Runs outside the queue (handlers may open windows). */
  async function askForward(kind: 'page' | 'window'): Promise<boolean> {
    const top = entries[entries.length - 1];
    for (const {
      handler,
    } of forward.list(top.id).filter((item) => kind === PAGE || item.windows)) {
      const answer = await handler();
      if (answer === false) {
        return false;
      }
      isFunction(answer) && returns.add(top.id, answer);
    }
    return true;
  }

  /** History first: if the browser refuses the entry, the stack stays as it was. */
  function push(entry: TEntry): void {
    pushState(
      mark(entry), '', hrefOf(entry),
    );
    entries = [...entries, entry];
    ahead = []; // a new step forgets what was ahead, as the browser does
    publish();
  }

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────

  // A reload or a deep link starts from the page in the address; windows are never reopened (D-011).
  reset(start);
  attachEvent(
    window, 'popstate', (event: PopStateEvent) => {
      if (waiter) {
        const done = waiter;
        waiter = null;
        done(event.state);
        return;
      }
      void enqueue(() => settle(event.state));
    },
  );

  // ── steps ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * A new page. Forward handlers are asked first — outside the queue, they may open windows; with none, the step takes
   * its place in the queue at once, so steps keep their call order.
   */
  async function go(location: TUrlProps): Promise<boolean> {
    if (describeLocation(location).startsOver) {
      await startOver(location);
      return true;
    }
    if (hasForward(PAGE) && !(await askForward(PAGE))) {
      return false;
    }
    await enqueue(() => push(page(location, entries.length)));
    return true;
  }

  /** Swaps the top page in place — no new history entry; windows over it close first (their guards are asked). */
  function replace(location: TUrlProps): Promise<void> {
    return enqueue(async () => {
      const current = entries.length - 1;
      const index = entries.lastIndexOf(topPage(entries));
      if (index < current) {
        await settle(await travel(index - current));
        if (entries.length - 1 !== index) {
          return; // a window's guard kept it open
        }
      }
      const old = entries[index];
      runOpened([old], CLOSE);
      forget(old);
      const fresh = page(location, index);
      replaceState(
        mark(fresh), '', location.href,
      );
      entries = [...entries.slice(0, index), fresh];
      ahead = [];
      publish();
    });
  }

  /** Drops every page and window and opens `location` alone — sign out, switching account. */
  function startOver(location: TUrlProps): Promise<void> {
    return enqueue(async () => {
      const current = entries.length - 1;
      if (current > 0) {
        await travel(-current);
      }
      reset(location);
    });
  }

  /**
   * Opens a window over the current entry (a history entry: back closes it); resolves its result, `null` if dismissed.
   * The browser's Forward reopens it after it was closed, unless `{ reopen: false }` (confirmations — D-024).
   */
  async function open<R = unknown>(
    win: unknown,
    params?: unknown,
    options?: TOpenOptions,
  ): Promise<R | null> {
    assertOpenOptions(options);
    if (hasForward(WINDOW) && !(await askForward(WINDOW))) {
      return null;
    }
    return new Promise<R | null>((done) => {
      void enqueue(() => {
        const entry: TWindowEntry = {
          kind: WINDOW,
          id: nextId++,
          depth: entries.length,
          window: win,
          params,
          reopen: options?.reopen !== false,
        };
        resolvers.set(entry.id, done as (result: unknown) => void);
        push(entry);
      });
    });
  }

  /** Closes a window with a result (and every entry above it). */
  function close(entryId: number, result?: unknown): Promise<void> {
    return enqueue(async () => {
      const entry = entries.find((item) => item.id === entryId);
      if (!entry || entry.depth === 0) {
        return;
      }
      if (isDefined(result)) {
        results.set(entryId, result);
      }
      await settle(await travel(entry.depth - 1 - (entries.length - 1)));
    });
  }

  /**
   * Back in one move to the depth `target` gives for the stack as it is when the step's turn comes (steps queued
   * before it — a window closing — have run by then); the guards of the entries left are asked, top first — a refusal
   * stops there (`locked`); `force` — they aren't asked. Already at or below that depth — `locked` too, nothing moved.
   * One browser move: the pages between are never shown.
   */
  async function backTo(target: (current: number) => number, force: boolean): Promise<TBackLocationResponse> {
    const outcome = await enqueue(async () => {
      const current = entries.length - 1;
      const depth = Math.max(0, target(current));
      return depth < current ? settle(await travel(depth - current), force) : STAYED;
    });
    return {
      locked: !(await outcome.left),
    };
  }

  /** Back through history to the current section's main page. */
  function backToSection(): Promise<void> {
    return enqueue(async () => {
      const section = state.section;
      if (!isDefined(section)) {
        return;
      }
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.kind === PAGE && entry.info.section === section && entry.info.sectionHome) {
          if (i < entries.length - 1) {
            await settle(await travel(i - (entries.length - 1)));
          }
          return;
        }
      }
      const home = sections[section];
      home && push(page(home, entries.length));
    });
  }

  /** A tab was tapped: its section (its own stack with `separate`) — or back to its main page if it is shown. */
  async function switchSection(section: string): Promise<void> {
    if (state.section === section) {
      await backToSection();
      return;
    }
    const home = sections[section];
    if (!home) {
      return;
    }
    if (!separate) {
      await go(home);
      return;
    }
    await enqueue(async () => {
      dropWindows();
      publish();
      if (entries.length > 1) {
        await travel(-(entries.length - 1));
      }
      if (!stacks.has(section)) {
        stacks.set(section, [page(home, 0)]);
      }
      rebuild(section);
    });
  }

  // ── registrations ─────────────────────────────────────────────────────────────────────────────────────────────

  /** Runs `effect` now; its cleanup runs when the entry starts being left, and it runs again if leaving is refused. */
  function whileOpen(entryId: number, effect: () => void | (() => void)): () => void {
    const item = {
      effect,
      cleanup: effect(),
    };
    const remove = opened.add(entryId, item);
    return () => {
      remove();
      const cleanup = item.cleanup;
      item.cleanup = undefined;
      isFunction(cleanup) && cleanup();
    };
  }

  /** `handler` runs before a page (with `windows` — also a window) opens over the entry, by a step or by Forward. */
  function onForward(
    entryId: number, handler: TForwardHandler, options?: { windows?: boolean },
  ): () => void {
    return forward.add(entryId, {
      handler,
      windows: Boolean(options?.windows),
    });
  }

  /** `guard` is asked before the entry is left by going back; `false` keeps it. */
  function onBeforeLeave(entryId: number, guard: TLeaveGuard): () => void {
    return guards.add(entryId, guard);
  }

  // ── the address model ─────────────────────────────────────────────────────────────────────────────────────────

  const $historyDepth = $state.map((value) => value.depth);

  const $transitionStateHash = $transitionState.map((value) => ({
    ...value,
    location: value.location?.child || {},
    prev: value.prev?.child || {},
  }));

  const $prevLocation = $transitionState.map((value) => value.prev || {});
  const $prevQuery = $prevLocation.map(getQuery);
  const $prevPath = $prevLocation.map(getPath);
  const $prevHashLocation = $prevLocation.map(getChild);
  const $prevHashQuery = $prevHashLocation.map(getQuery);
  const $prevHashPath = $prevHashLocation.map(getPath);

  const $location = $transitionState.map((value) => value.location);
  const $query = $location.map(getQuery);
  const $path = $location.map(getPath);
  const $hashLocation = $location.map(getChild);
  const $hashQuery = $hashLocation.map(getQuery);
  const $hashPath = $hashLocation.map(getPath);
  const LinkProvider = createLinkProvider(deps);
  const NavLinkProvider = createNavLinkProvider(deps);
  const paramStorageProvider = createParamStorageProvider(deps);
  const Link = LinkProvider({
    pushLocation,
  });
  const HashLink = LinkProvider({
    pushLocation: pushHashLocation,
    hasHash: true,
  });
  const NavLink = NavLinkProvider(Link, $location);
  const HashNavLink = NavLinkProvider(HashLink, $hashLocation);

  const $immediateLocation = $state.map((value) => value.location);
  const $immediateQuery = $immediateLocation.map(getQuery);
  const $immediatePath = $immediateLocation.map(getPath);
  const $immediateHashLocation = $immediateLocation.map(getChild);
  const $immediateHashQuery = $immediateHashLocation.map(getQuery);
  const $immediateHashPath = $immediateHashLocation.map(getPath);

  /**
   * A push or a replace of a whole location; `options.onBeforeUnload` — a watcher on the new entry. Resolves with the
   * location now shown (read from the address).
   */
  async function changeLocation(
    location: TUrlProps, _options?: TLocationOptions, isReplace?: boolean | number,
  ): Promise<TUrlProps> {
    const options = _options || {};
    _quiet = !!options.quiet;
    try {
      if (isReplace) {
        await replace(location);
      } else if (!(await go(location))) {
        return state.location; // a forward watcher kept the page
      }
    } finally {
      _quiet = false;
    }
    const {
      onBeforeUnload: watcher,
    } = options;
    if (watcher) {
      if (isFunction(watcher)) {
        onBeforeUnload(watcher);
      } else {
        const {
          callback,
          ...watcherOptions
        } = watcher;
        onBeforeUnload(callback, watcherOptions);
      }
    }
    return state.location;
  }

  /**
   * The back steps: one step (`backLocation`) or several (`backToDepth`, `backRepeat`, `backToStart` — the transition
   * state catches up once, at the end, unless `quiet`). `force` — leave confirmations aren't asked.
   */
  async function backBy(
    target: (current: number) => number, options: TLocationNavigationOptions | undefined, several: boolean,
  ): Promise<TBackLocationResponse> {
    const quiet = !!options?.quiet;
    _quietTransition = several || quiet;
    try {
      return await backTo(target, !!options?.force);
    } finally {
      _quietTransition = false;
      several && !quiet && immediateTransition();
    }
  }

  function backLocation(options?: TLocationNavigationOptions): Promise<TBackLocationResponse | undefined> {
    return entries.length < 2 ? Promise.resolve(undefined) : backBy(
      (current) => current - 1, options, false,
    );
  }

  const backToDepth = (depth: number, options?: TLocationNavigationOptions) => backBy(
    () => depth, options, true,
  );

  const backRepeat = (count: number, options?: TLocationNavigationOptions) =>
    backBy(
      (current) => current - count, options, true,
    );

  const backToStart = (options?: TLocationNavigationOptions) => backToDepth(0, options);

  function getHistory(): TUrlProps[] {
    return state.history as TUrlProps[];
  }
  function getCurrentLocation() {
    return state.location;
  }
  function getCurrentHashLocation() {
    return getCurrentLocation().child;
  }
  function getPrevLocation() {
    return state.prev;
  }
  /** The first entry ahead (what Forward brings back): a page's address, or the address a window opens over. */
  function getNextLocation(): TUrlProps | undefined {
    const first = ahead[0];
    return first && (first.kind === PAGE ? first.location : state.location);
  }
  function getFromLocation() {
    return _fromLocation;
  }
  function getPrevHashLocation() {
    return getPrevLocation()?.child;
  }
  function getNextHashLocation() {
    return getNextLocation()?.child;
  }
  function getFromHashLocation() {
    return getFromLocation()?.child;
  }
  function pushLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(mergeLocation(state.location, extendsLocation), options);
  }
  function storagePushLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(urlExtend(state.location, extendsLocation), options);
  }
  function replaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      mergeLocation(state.location, extendsLocation), options, 1,
    );
  }
  function storageReplaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      urlExtend(state.location, extendsLocation), options, 1,
    );
  }
  function pushHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return pushLocation({
      child,
    },
    options);
  }
  function storagePushHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return storagePushLocation({
      child,
    },
    options);
  }
  function storageReplaceHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return storageReplaceLocation({
      child,
    },
    options);
  }
  function replaceHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return replaceLocation({
      child,
    },
    options);
  }
  /** Clears the history and starts from this address (e.g. home after a reset). */
  function startOverLocation(extendsLocation: Partial<TUrlProps>): Promise<void> {
    return startOver(mergeLocation(state.location, extendsLocation));
  }
  function startOverHashLocation(child: Partial<TUrlProps>): Promise<void> {
    return startOverLocation({
      child,
    });
  }

  /**
   * Leaves the shown page — e.g. a page the player may not open (fundamentool D-031): back to the previous page of the
   * app if the history has one (windows over the page close too), otherwise the page is replaced with `fallback`.
   * Resolves when done; a leave confirmation that refuses keeps the page.
   *
   * @example
   * if (!progress.isUnlocked(levelId)) {
   *   await router.leavePage({ fallback: { path: '/' } });
   * }
   */
  async function leavePageWith(options: TLeavePageOptions, replaceWith: (fallback: Partial<TUrlProps>) => Promise<unknown>): Promise<void> {
    if (!isObject(options) || isArray(options)) {
      throw new TypeError(`${ROUTER_WHERE} leavePage: expects an options object, got ${describeValue(options)}`);
    }
    assertKnownOptions(
      `${ROUTER_WHERE} leavePage`, options, LEAVE_PAGE_OPTION_KEYS,
    );
    const fallback = options.fallback;
    if (!isObject(fallback)) {
      throw new TypeError(`${ROUTER_WHERE} leavePage: "fallback" expects a location ({ path, query, … }), got ${describeValue(fallback)}`);
    }
    // The page's place is read when the step's turn comes (a window closing before it may have changed the stack).
    if (entries.lastIndexOf(topPage(entries)) > 0) {
      await backTo(() => entries.lastIndexOf(topPage(entries)) - 1, false);
    } else {
      await replaceWith(fallback);
    }
  }

  const leavePage = (options: TLeavePageOptions) => leavePageWith(options, replaceLocation);
  const leaveHashPage = (options: TLeavePageOptions) => leavePageWith(options, replaceHashLocation);

  /** Is the entry at `depth` being left right now (its watchers are being asked)? */
  function isTryClosingLocation(depth: number) {
    const entry = entries[depth];
    return isDefined(entry) && closing.has(entry.id);
  }

  /** Does the entry at `depth` have lock watchers? */
  function isWaitingUnloadLocation(depth: number) {
    const entry = entries[depth];
    return isDefined(entry) && (guards.has(entry.id) || forward.has(entry.id));
  }

  function isTryClosingCurrentLocation() {
    return isTryClosingLocation(entries.length - 1);
  }

  function isWaitingUnloadCurrentLocation() {
    return isWaitingUnloadLocation(entries.length - 1);
  }

  /**
   * A lock watcher on the current entry: `backwards` — asked before it is left by going back; `forwards` — before a
   * page or a window opens over it (by a step or by Forward). `false` (or a promise of it) keeps it. Returns the
   * unsubscribe.
   */
  function onBeforeUnload(callback: TLockWatcherFn, options?: TLockWatcherOptions) {
    const watcher = {
      ...DEFAULT_LOCK_WATCHER_OPTIONS,
      ...options,
    };
    const entryId = entries[entries.length - 1].id;
    const location = state.location;
    const stops: (() => void)[] = [];
    watcher.backwards && stops.push(onBeforeLeave(entryId, async () => (await callback(location)) !== false));
    watcher.forwards && stops.push(onForward(
      entryId, async (): Promise<false | void> => ((await callback(location)) === false ? false : undefined), {
        windows: true,
      },
    ));
    return once(() => stops.forEach((stop) => stop()));
  }

  const {
    useRouteIsFocus,
    NavigationHostProvider,
    useEntry,
    useRouterState,
    useWhileOpen,
    useOnForward,
    useBeforeLeave,
  } = createRouterView(deps, {
    $state,
    entries: () => entries,
    own,
    close,
    whileOpen,
    onForward,
    onBeforeLeave,
  });

  return {
    $historyDepth,
    $transitionState,
    $transitionStateHash,
    $state,
    $location,
    $query,
    $path,
    $hashLocation,
    $hashQuery,
    $hashPath,

    $immediateLocation,
    $immediateQuery,
    $immediatePath,
    $immediateHashLocation,
    $immediateHashQuery,
    $immediateHashPath,

    $prevLocation,
    $prevQuery,
    $prevPath,
    $prevHashLocation,
    $prevHashQuery,
    $prevHashPath,

    LinkProvider,
    routerForObservableMapProvider,
    paramStorageProvider,
    routerByLocationProvider: routerByLocationProviderProvider($transitionState),
    routerByHashLocationProvider: routerByLocationProviderProvider($transitionStateHash as any),
    paramStorage: paramStorageProvider($query, storagePushLocation),
    hashParamStorage: paramStorageProvider($hashQuery, storagePushHashLocation),
    paramReplaceStorage: paramStorageProvider($query, storageReplaceLocation),
    hashParamReplaceStorage: paramStorageProvider($hashQuery, storageReplaceHashLocation),
    Link,
    NavLink,
    HashLink,
    HashNavLink,
    getHistory,
    getCurrentLocation,
    getCurrentHashLocation,
    getPrevLocation,
    getNextLocation,
    getFromLocation,
    getPrevHashLocation,
    getNextHashLocation,
    getFromHashLocation,
    pushLocation,
    replaceLocation,
    pushHashLocation,
    replaceHashLocation,
    storagePushLocation,
    storagePushHashLocation,
    storageReplaceLocation,
    storageReplaceHashLocation,
    startOverLocation,
    startOverHashLocation,
    leavePage,
    leaveHashPage,
    backLocation,
    backToDepth,
    backRepeat,
    backToStart,
    isTryClosingLocation,
    isWaitingUnloadLocation,
    isTryClosingCurrentLocation,
    isWaitingUnloadCurrentLocation,
    onBeforeUnload,
    useRouteIsFocus,

    open,
    close,
    backToSection,
    switchSection,
    whileOpen,
    onForward,
    onBeforeLeave,
    NavigationHostProvider,
    useEntry,
    useRouterState,
    useWhileOpen,
    useOnForward,
    useBeforeLeave,
  };
}

/**
 * The router over the whole address: path, query and the hash part as a child location (see README).
 *
 * @example
 * const router = routerProvider({ window, Component, useEffect, useState, useRef, createContext, useContext,
 *   createElement, forwardRef, createObservable, createApi });
 * await router.pushLocation({ path: '/notes/3' });
 */
export function routerProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps, false);
  const {
    pushLocation,
    replaceLocation,
  } = instance;

  return {
    ...instance,
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: withAsyncLock(pushLocation, THROTTLE),
    replaceLocationThrottled: withAsyncLock(replaceLocation, THROTTLE),
    backLocationThrottled: withAsyncLock(instance.backLocation, THROTTLE),
  };
}

export type TRouterProvider = typeof routerProvider;
export type TRouter = ReturnType<TRouterProvider>;

/**
 * The router over the hash part of the address (`https://game.example/#/level/2`): the hash part is the location —
 * for static hosting and iframes (VK, Telegram, FB Instant). The rest of the address stays as it is.
 */
export function hashRouterProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps, true);
  const {
    pushHashLocation: pushLocation,
    replaceHashLocation: replaceLocation,
  } = instance;

  return {
    ...instance,
    Link: instance.HashLink,
    NavLink: instance.HashNavLink,
    $prevLocation: instance.$prevHashLocation,
    $location: instance.$hashLocation,
    $path: instance.$hashPath,
    $query: instance.$hashQuery,
    $immediateQuery: instance.$immediateHashQuery,
    paramStorage: instance.hashParamStorage,
    paramReplaceStorage: instance.hashParamReplaceStorage,
    routerByLocationProvider: instance.routerByHashLocationProvider,
    pushLocation,
    replaceLocation,
    getCurrentLocation: instance.getCurrentHashLocation,
    getPrevLocation: instance.getPrevHashLocation,
    getNextLocation: instance.getNextHashLocation,
    getFromLocation: instance.getFromHashLocation,
    startOverLocation: instance.startOverHashLocation,
    leavePage: instance.leaveHashPage,
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: withAsyncLock(pushLocation, THROTTLE),
    replaceLocationThrottled: withAsyncLock(replaceLocation, THROTTLE),
    backLocationThrottled: withAsyncLock(instance.backLocation, THROTTLE),
  } as TRouter;
}
