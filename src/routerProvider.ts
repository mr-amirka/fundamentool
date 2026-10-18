import type {
  Observable, TObservableAdapter,
} from './Observable/types';

type TElementType = any;
type TAnchorProps = Record<string, any>;
type TClickEvent = { preventDefault?: () => void } & Record<string, any>;
type TEffectCallback = () => void | (() => void | undefined);
type TDependencyList = ReadonlyArray<unknown>;

import {
  wait, 
} from './wait';
import {
  wrapper, 
} from './wrapper';
import {
  urlParse, TUrlProps, 
} from './urlParse';
import {
  urlExtend, 
} from './urlExtend';
import {
  TParams, 
} from './unparam';
import {
  routeParseProvider, 
} from './routeParseProvider';
import {
  TRouteMapper, 
} from './regexpMapperProvider';
import {
  isMatch, 
} from './is/isMatch';
import {
  isEqual, 
} from './is/isEqual';
import {
  childClassOfReact, 
} from './childClassOfReact';
import {
  noop, 
} from './noop';
import {
  extend, 
} from './extend';
import {
  isFunction, 
} from './is/isFunction';
import {
  once, 
} from './once';
import {
  assertKnownOptions, 
} from './assertKnownOptions';
import {
  describeValue, 
} from './describeValue';
import {
  createNavigation, 
} from './navigation/createNavigation';
import type {
  TEntry, TNavigationState, TPageEntry, TPageInfo, 
} from './navigation/createNavigation';
import {
  createNavigationView, 
} from './navigation/createNavigationView';
import type {
  TNavigationView, TNavigationViewOptions, TViewKit, 
} from './navigation/createNavigationView';
import {
  createBrowserHistory, 
} from './navigation/history';

export type {
  TUrlProps, TParams, TRouteMapper, 
};
// What the router's windows, pages and view are typed with (the engine itself is internal — D-022).
export type {
  TEntry, TNavigation, TNavigationState, TPageEntry, TPageInfo, TWindowEntry, 
} from './navigation/createNavigation';
export type {
  TNavigationView, TViewKit, TWindowProps, 
} from './navigation/createNavigationView';

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
  quiet?: boolean;
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

export type TRouterState = {
  depth: number;
  prev: null | TUrlProps;
  location: TUrlProps;
  history: (TUrlProps | null)[];
};

export type TRoute = {
  index: number;
  params: TParams;
} & TRouterState &
  Record<string, any>;

export type TBackLocationResponse = {
  locked: boolean;
};

const NOOP_OBJECT: TParams = {};

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
    let scopePos = route.indexOf('(');
    const length = route.length;
    if (scopePos > -1) {
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
 * The router's options besides the view library: how pages behave in the stack (the navigation core's options, with
 * a location instead of a path).
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
 * so the router works with any of them — plus {@link TRouterOptions}.
 */
export type TRouterProviderDeps = TObservableAdapter & TRouterOptions & {
  window: Window;
  Component: TElementType;
  useEffect: (...args: any[]) => void;
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
};

/** What the router's page renderer gets: the core's page entry and the page's location. */
export type TRouterViewOptions = {
  /** The page for an entry; `location` is its parsed address (for `hashRouterProvider` — the hash part). */
  renderPage: (entry: TPageEntry, location: TUrlProps) => unknown;
  /** A window entry → its element (`entry.window` is what was passed to `open`, usually a component). */
  renderWindow: TNavigationViewOptions['renderWindow'];
};

/** The single list of accepted keys of the router's dependencies — checked against the type in tests. */
export const ROUTER_DEPS_KEYS = [
  'window',
  'Component',
  'useEffect',
  'createElement',
  'forwardRef',
  'createObservable',
  'createApi',
  'describe',
  'sections',
  'sectionHistory',
  'keep',
  'exitMs',
] as const;

const ROUTER_WHERE = '[fundamentool] routerProvider';

/** Checks the dependencies once, at creation (lab convention `api-input-validation.md`). */
function assertRouterDeps(deps: unknown): asserts deps is TRouterProviderDeps {
  if (typeof deps !== 'object' || deps === null || Array.isArray(deps)) {
    throw new TypeError(`${ROUTER_WHERE}: expects a dependencies object, got ${describeValue(deps)}`);
  }
  assertKnownOptions(
    ROUTER_WHERE, deps, ROUTER_DEPS_KEYS,
  );
  const raw = deps as Record<string, unknown>;
  const win = raw.window as Window | null;
  if (typeof win !== 'object' || win === null || typeof win.history?.pushState !== 'function') {
    throw new TypeError(`${ROUTER_WHERE}: "window" expects a browser window, got ${describeValue(win)}`);
  }
  for (const key of [
    'useEffect',
    'createElement',
    'forwardRef',
    'createObservable',
    'createApi',
  ] as const) {
    if (typeof raw[key] !== 'function') {
      throw new TypeError(`${ROUTER_WHERE}: "${key}" expects a function, got ${describeValue(raw[key])}`);
    }
  }
  if (raw.describe !== undefined && typeof raw.describe !== 'function') {
    throw new TypeError(`${ROUTER_WHERE}: "describe" expects a function (location) => page info, got ${describeValue(raw.describe)}`);
  }
}

/**
 * The router base, built on the navigation core (fundamentool D-022): every page and every window is a history entry
 * of one stack; the router keeps its URL model (path, query, the hash part as a child location) and its observables
 * on top. `hash` — the hash part is the location (`hashRouterProvider`).
 */
function routerProviderBase(deps: TRouterProviderDeps, hash: boolean) {
  assertRouterDeps(deps);
  const {
    Component,
    window,
    createElement,
    forwardRef,
    useEffect,
    createObservable,
    createApi,
  } = deps;
  const describePage = deps.describe;
  const start = urlParse(window.location.href);
  /** A section's address: for the hash router the section path goes after `#`, the rest of the address stays. */
  const sectionHref = (path: string) => (hash ? mergeLocation(start, {
    child: urlParse(path),
  }).href : path);
  const sections = deps.sections && Object.fromEntries(Object.entries(deps.sections).map(([name, path]) => [name, sectionHref(path)]));

  /** Locations of entries by address (an entry's `path` is its whole address): pushed ones as given, others parsed. */
  const parsed = new Map<string, TUrlProps>();
  function remember(href: string, location: TUrlProps): TUrlProps {
    if (parsed.size > 256) {
      parsed.clear();
    }
    parsed.set(href, location);
    return location;
  }
  function parse(href: string): TUrlProps {
    return parsed.get(href) || remember(href, urlParse(href));
  }
  /** The location a page describes itself by: the hash part for the hash router. */
  const ownLocation = (href: string): TUrlProps => (hash ? getChild(parse(href)) : parse(href));

  const core = createNavigation({
    history: createBrowserHistory(window, 'url'),
    describe: (href) => (describePage ? describePage(ownLocation(href)) ?? {} : {}),
    ...(sections ? {
      sections,
    } : {}),
    ...(deps.sectionHistory ? {
      sectionHistory: deps.sectionHistory,
    } : {}),
    ...(deps.keep !== undefined ? {
      keep: deps.keep,
    } : {}),
    ...(deps.exitMs !== undefined ? {
      exitMs: deps.exitMs,
    } : {}),
  });

  /** The page an entry belongs to: itself, or the page under a window. */
  function pageAt(entries: readonly TEntry[], index: number): TPageEntry {
    for (let i = index; i >= 0; i--) {
      if (entries[i].kind === 'page') {
        return entries[i] as TPageEntry;
      }
    }
    /* istanbul ignore next -- the bottom entry is always a page */
    throw new Error('routerProvider: no page in the stack');
  }

  function snapshot(state: TNavigationState): TRouterState {
    const {
      entries,
    } = state;
    const depth = entries.length - 1;
    return {
      depth,
      prev: depth > 0 ? parse(pageAt(entries, depth - 1).path) : null,
      location: parse(state.page.path),
      history: entries.map((_, index) => parse(pageAt(entries, index).path)),
    };
  }

  let _hasDurationLink = false;
  let _locked = 0;
  /** A quiet push: the address changes, the observables don't. */
  let _quiet = false;
  /** Going back several steps: the transition state follows only at the end. */
  let _quietTransition = false;
  let _routerState = snapshot(core.getState());
  let _currentLocation = _routerState.location;
  let _fromLocation: TUrlProps | null = null;
  let _nextLocation: TUrlProps | undefined;
  let _shownPage = core.getState().page.id;
  /** Lock watchers per entry id — for `isWaitingUnloadLocation`. */
  const _watchers = new Map<number, number>();

  const $state = createObservable<TRouterState>(_routerState);
  const {
    emitState,
  } = createApi($state, {
    emitState: (_, payload: TRouterState) => payload,
  });

  const $trasitionState = createObservable<TRouterState>($state.getState());
  const {
    emitTransition,
  } = createApi($trasitionState, {
    emitTransition: (state, payload: Partial<TRouterState>) => ({
      ...state,
      ...payload,
    }),
  });

  const $historyDepth = createObservable<number>(_routerState.depth);
  const {
    emitHistoryDepth,
  } = createApi($historyDepth, {
    emitHistoryDepth: (_, payload: number) => payload,
  });

  core.subscribe((state) => {
    const next = snapshot(state);
    const prev = _routerState;
    const pageId = state.page.id;
    if (pageId === _shownPage && next.depth === prev.depth) {
      return; // a window finished its exit, a hidden section changed — nothing the router shows
    }
    _shownPage = pageId;
    _routerState = next;
    _nextLocation = next.depth < prev.depth ? prev.history[next.depth + 1] ?? undefined : undefined;
    if (next.location !== _currentLocation) {
      _fromLocation = _currentLocation;
      _currentLocation = next.location;
    }
    const alive = new Set(state.entries.map((entry) => entry.id));
    _watchers.forEach((_, id) => {
      alive.has(id) || _watchers.delete(id);
    });
    if (_quiet) {
      return;
    }
    emitState(next);
    emitHistoryDepth(next.depth);
    _quietTransition || immediateTransition();
  });

  const $stateHash = $state.map((state) => ({
    ...state,
    current: state.location?.child || {},
    prev: state.prev?.child || {},
  }));

  const $trasitionStateHash = $trasitionState.map((state) => ({
    ...state,
    location: state.location?.child || {},
    prev: state.prev?.child || {},
  }));

  const $prevLocation = $trasitionState.map((state) => state.prev || {});
  const $prevQuery = $prevLocation.map(getQuery);
  const $prevPath = $prevLocation.map(getPath);
  const $prevHashLocation = $prevLocation.map(getChild);
  const $prevHashQuery = $prevHashLocation.map(getQuery);
  const $prevHashPath = $prevHashLocation.map(getPath);

  const $location = $trasitionState.map((state) => state.location);
  const $query = $location.map(getQuery);
  const $path = $location.map(getPath);
  const $hashLocation = $location.map(getChild);
  const $hashQuery = $hashLocation.map(getQuery);
  const $hashPath = $hashLocation.map(getPath);
  const Link = LinkProvider({
    pushLocation,
  });
  const HashLink = LinkProvider({
    pushLocation: pushHashLocation,
    hasHash: true,
  });
  const NavLink = NavLinkProvider(Link, $location);
  const HashNavLink = NavLinkProvider(HashLink, $hashLocation);

  const $immeidateLocation = $state.map((state) => state.location);
  const $immeidateQuery = $immeidateLocation.map(getQuery);
  const $immeidatePath = $immeidateLocation.map(getPath);
  const $immeidateHashLocation = $immeidateLocation.map(getChild);
  const $immeidateHashQuery = $immeidateHashLocation.map(getQuery);
  const $immeidateHashPath = $immeidateHashLocation.map(getPath);

  function topEntry(): TEntry {
    const {
      entries,
    } = core.getState();
    return entries[entries.length - 1];
  }

  function currentDepth(): number {
    return core.getState().entries.length - 1;
  }

  /** Address changes one at a time, in call order (a push asks forward watchers first — a replace must not overtake it). */
  let _changes: Promise<unknown> = Promise.resolve();
  function changeLocation(
    location: TUrlProps, options?: TLocationOptions, replace?: boolean | number,
  ): Promise<TUrlProps> {
    const result = _changes.then(() => changeLocationNow(
      location, options, replace,
    ));
    _changes = result.catch(noop);
    return result;
  }

  async function changeLocationNow(
    location: TUrlProps, _options?: TLocationOptions, replace?: boolean | number,
  ): Promise<TUrlProps> {
    const options = _options || {};
    // The location as the caller built it (query values as passed — '3' stays a string), not re-parsed from the address.
    remember(location.href, location);
    _quiet = !!options.quiet;
    try {
      if (replace) {
        await core.replace(location.href);
      } else if (!(await core.go(location.href))) {
        return _currentLocation; // a forward watcher of the page kept it
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
          callback, ...watcherOptions
        } = watcher;
        onBeforeUnload(callback, watcherOptions);
      }
    }
    return location;
  }

  async function backLocation(options?: TLocationNavigationOptions | any): Promise<TBackLocationResponse | undefined> {
    if (currentDepth() < 1) {
      return undefined;
    }
    _quietTransition = !!options?.quiet;
    try {
      return {
        locked: !(await core.back()),
      };
    } finally {
      _quietTransition = false;
    }
  }

  async function backToDepth(targetDepth: number, options?: TLocationNavigationOptions): Promise<TBackLocationResponse> {
    targetDepth = Math.max(0, targetDepth);
    let response: TBackLocationResponse = {
      locked: true,
    };
    _quietTransition = true;
    try {
      let depth = currentDepth();
      while (depth > targetDepth) {
        response = {
          locked: !(await core.back()),
        };
        const reached = currentDepth();
        if (response.locked || reached >= depth) {
          break;
        }
        depth = reached;
      }
    } finally {
      _quietTransition = false;
    }
    options?.quiet || immediateTransition();
    return response;
  }

  const backRepeat = (count: number, options?: TLocationNavigationOptions) =>
    backToDepth(currentDepth() - count, options);

  const backToStart = (options?: TLocationNavigationOptions) => backToDepth(0, options);

  function immediateTransition() {
    emitTransition($state.getState());
  }

  function getHistory(): TUrlProps[] {
    return _routerState.history as TUrlProps[];
  }
  function getCurrentLocation() {
    return _currentLocation;
  }
  function getCurrentHashLocation() {
    return getCurrentLocation().child;
  }
  function getPrevLocation() {
    return _routerState.prev;
  }
  function getNextLocation() {
    return _nextLocation;
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
    return changeLocation(mergeLocation(_currentLocation, extendsLocation), options);
  }
  function storagePushLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(urlExtend(_currentLocation, extendsLocation), options);
  }
  function replaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      mergeLocation(_currentLocation, extendsLocation), options, 1,
    );
  }
  function storageReplaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      urlExtend(_currentLocation, extendsLocation), options, 1,
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

  /** Is the entry at `depth` being left right now (its watchers are being asked)? */
  function isTryClosingLocation(depth: number) {
    const entry = core.getState().entries[depth];
    return !!entry && core.isClosing(entry.id);
  }

  /** Does the entry at `depth` have lock watchers? */
  function isWaitingUnloadLocation(depth: number) {
    const entry = core.getState().entries[depth];
    return !!entry && (_watchers.get(entry.id) || 0) > 0;
  }

  function isTryClosingCurrentLocation() {
    return isTryClosingLocation(currentDepth());
  }

  function isWaitingUnloadCurrentLocation() {
    return isWaitingUnloadLocation(currentDepth());
  }

  /**
   * A lock watcher on the current entry: `backwards` — asked before it is left by going back; `forwards` — before a
   * page or a window opens over it. `false` (or a promise of it) keeps it. Returns the unsubscribe.
   */
  function onBeforeUnload(callback: TLockWatcherFn, options?: TLockWatcherOptions) {
    const watcher = {
      ...DEFAULT_LOCK_WATCHER_OPTIONS,
      ...options,
    };
    const entryId = topEntry().id;
    const location = _currentLocation;
    const stops: (() => void)[] = [];
    if (watcher.backwards) {
      stops.push(core.onBeforeLeave(entryId, async () => (await callback(location)) !== false));
    }
    if (watcher.forwards) {
      stops.push(core.onForward(
        entryId, async (): Promise<false | void> => ((await callback(location)) === false ? false : undefined), {
          windows: true,
        },
      ));
    }
    _watchers.set(entryId, (_watchers.get(entryId) || 0) + 1);
    return once(() => {
      stops.forEach((stop) => stop());
      const count = (_watchers.get(entryId) || 1) - 1;
      count > 0 ? _watchers.set(entryId, count) : _watchers.delete(entryId); // eslint-disable-line
    });
  }

  /** Opens a window over the current entry (a history entry: back closes it); resolves its result, `null` if dismissed. */
  function open<R = unknown>(win: unknown, params?: unknown): Promise<R | null> {
    return core.open<R>(win, params);
  }

  /** Clears the history and starts from this address (e.g. the game's home after a reset). */
  function startOverLocation(extendsLocation: Partial<TUrlProps>): Promise<void> {
    return core.startOver(mergeLocation(_currentLocation, extendsLocation).href);
  }

  function startOverHashLocation(child: Partial<TUrlProps>): Promise<void> {
    return startOverLocation({
      child,
    });
  }

  /**
   * The view over the router's stack: the host (page layers — covered `keep` pages stay mounted and hidden, each with
   * its own scroll — and the windows) and the hooks, built from an injected view library.
   */
  function view(kit: TViewKit, options: TRouterViewOptions): TNavigationView {
    return createNavigationView(
      kit, core, {
        renderPage: (entry) => options.renderPage(entry, ownLocation(entry.path)),
        renderWindow: options.renderWindow,
      },
    );
  }

  function LinkProvider({
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
      addition.onClick = async (e: any) => {
        e.preventDefault && e.preventDefault();
        if (_hasDurationLink || props.active) {
          return false;
        }

        _hasDurationLink = true;

        const timeout = props.timeout || 0;

        if (timeout) {
          await wait(timeout);
        }

        if ((await onClick(e)) === false) {
          return;
        }

        if (url) {
          await pushLocation(options);
        }

        _hasDurationLink = false;
        return false;
      };

      return createElement(props.component || 'a',
        addition);
    });
  }
  function NavLinkProvider(Link: TElementType, $location: Observable<any>): TElementType {
    return childClassOfReact(Component, (self) => {
      let subscription: (() => any) | 0;
      const setState = self.setState.bind(self);
      self.state = $location.getState();
      self.componentWillMount = () => {
        subscription || (subscription = $location.watch(setState));
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
  }

  function paramStorageProvider($query: Observable<TParams>, pushLocation: TPushLocation) {
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
      getKeys: () => Object.keys(state),
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
  }

  /**
   * `effect` while the entry this component was rendered in is open: cleaned up when it starts being left (before its
   * watchers are asked), run again if leaving is refused.
   */
  const useRouteIsFocus = (effect: TEffectCallback, deps?: TDependencyList) => {
    const entryId = topEntry().id;
    (useEffect as any)(() => core.whileOpen(entryId, effect as () => void | (() => void)), deps || []);
  };

  return {
    $historyDepth,
    $trasitionState,
    $trasitionStateHash,
    $state,
    $stateHash,
    $location,
    $query,
    $path,
    $hashLocation,
    $hashQuery,
    $hashPath,

    $immeidateLocation,
    $immeidateQuery,
    $immeidatePath,
    $immeidateHashLocation,
    $immeidateHashQuery,
    $immeidateHashPath,

    $prevLocation,
    $prevQuery,
    $prevPath,
    $prevHashLocation,
    $prevHashQuery,
    $prevHashPath,

    LinkProvider,
    routerForObservableMapProvider,
    paramStorageProvider,
    routerByLocationProvider: routerByLocationProviderProvider($trasitionState),
    routerByHashLocationProvider: routerByLocationProviderProvider($trasitionStateHash as any),
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

    /** The navigation core under the router: its state (entries, layers, the section) and the low-level methods. */
    navigation: core,
    open,
    close: core.close,
    startOverLocation,
    startOverHashLocation,
    backToSection: core.backToSection,
    switchSection: core.switchSection,
    view,
  };
}

function debounceLocation<A extends any[]>(callback: (...args: A) => unknown) {
  let _debounced = false;
  return async (...args: Parameters<typeof callback>) => {
    if (_debounced) {
      return;
    }
    _debounced = true;
    await Promise.all([wait(300), callback(...args)]);
    _debounced = false;
  };
}

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
    pushLocationThrottled: debounceLocation(pushLocation),
    replaceLocationThrottled: debounceLocation(replaceLocation),
    backLocationThrottled: debounceLocation(instance.backLocation),
  };
}

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
    $immeidateQuery: instance.$immeidateHashQuery,
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
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: debounceLocation(pushLocation),
    replaceLocationThrottled: debounceLocation(replaceLocation),
    backLocationThrottled: debounceLocation(instance.backLocation),
  } as TRouter;
}

export type TRouterProvider = typeof routerProvider;
export type TRouter = ReturnType<TRouterProvider>;