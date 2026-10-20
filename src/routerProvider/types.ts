// The router's types: its entries, state, options and dependencies (fundamentool D-022…D-037).
import type {
  TObservableAdapter,
} from '../Observable/types';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';
import type {
  TElementType,
  TAnchorProps,
  TClickEvent,
} from './internalTypes';

export type {
  TParams,
} from '../unparam';
export type {
  TRouteMapper,
} from '../regexpMapperProvider';
export type {
  TUrlProps,
} from '../urlParse';

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
 * so the router works with any of them — plus {@link TRouterOptions}. All of them are required: the router builds its
 * host and hooks on them.
 */
export type TRouterProviderDeps = TObservableAdapter & TRouterOptions & {
  window: Window;
  Component: TElementType;
  useEffect: (...args: any[]) => void;
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
  useState: (...args: any[]) => any;
  useRef: (...args: any[]) => any;
  createContext: (...args: any[]) => any;
  useContext: (...args: any[]) => any;
};

/** What `router.NavigationHostProvider`'s host renders with. */
export type TNavigationHostOptions = {
  /** The page for an entry; `location` is its address (for `hashRouterProvider` — the hash part). */
  renderPage: (entry: TPageEntry, location: TUrlProps) => unknown;
  /** A window entry → its element (`entry.window` is what was passed to `open`, usually a component). */
  renderWindow: (entry: TWindowEntry, props: TWindowProps) => unknown;
};

