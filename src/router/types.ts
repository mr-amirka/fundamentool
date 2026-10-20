// The types of the history primitives, the router and the navigator (fundamentool D-038, D-039; spec router.md).
import type {
  Observable,
  TObservableAdapter,
} from '../Observable/types';
import type {
  TKeyValueStorage,
} from '../keyValueStorage';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';

export type {
  TParams,
} from '../unparam';
export type {
  TUrlProps,
} from '../urlParse';
export type {
  TKeyValueStorage,
} from '../keyValueStorage';

// ── history primitives ──────────────────────────────────────────────────────────────────────────────────────────

/** A part of a history entry, outer first: the address (path + query) ⊃ its hash ⊃ the entry's own state. */
export type THistoryPart = 'url' | 'hash' | 'state';

/** A history entry as one part sees it. */
export type THistoryEntry = {
  /** The part's location. */
  location: TUrlProps;
  /** What the part's owner wrote into the entry; `undefined` — nobody did (a first visit). */
  data: unknown;
};

/** One part of the history: read, write, move — how the browser does it stays inside. */
export type THistoryPrimitive = {
  /** The part in the current entry. */
  current(): THistoryEntry;
  /** A new entry: this part set, the outer parts kept, the inner ones cleared. */
  push(location: TUrlProps, data?: unknown): void;
  /** The current entry, changed the same way. */
  replace(location: TUrlProps, data?: unknown): void;
  /** A move made by the code; resolves with the part in the entry arrived at. */
  go(delta: number): Promise<THistoryEntry>;
  /** A move made by the player (Back / Forward) that changed this part. Returns the unsubscribe. */
  watch(listener: (entry: THistoryEntry) => void): () => void;
  /** What the address bar shows for `location` in this part — a link's `href`. */
  href(location: TUrlProps): string;
};

/** The three parts of one timeline. */
export type THistoryPrimitives = Record<THistoryPart, THistoryPrimitive>;

/** The primitives over an array, with the player's moves and a look inside. */
export type TMemoryHistoryPrimitives = THistoryPrimitives & {
  /** A move by the player. */
  navigate(delta: number): void;
  /** Each entry's address (`url#hash`). */
  entries(): string[];
  /** The current entry's place. */
  index(): number;
};

// ── the router ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Options of a step back. */
export type TBackOptions = {
  /** Don't ask the leave guards (sign out, a forced return). */
  force?: boolean;
};

/** Options of `params.set` / `remove` / `clear`. */
export type TParamsOptions = {
  /** Change the current entry instead of making a new one. */
  replace?: boolean;
};

/** How a router's steps are carried out: by the primitive, or by a navigator over it. */
export type TRouterDriver = {
  push(location: TUrlProps): Promise<void>;
  replace(location: TUrlProps): Promise<void>;
  back(options?: TBackOptions): Promise<boolean>;
};

/** The router's dependencies. */
export type TRouterDeps = TObservableAdapter & {
  /** The part of the history the router works in. */
  historyPrimitive: THistoryPrimitive;
};

/** A router: one part of the history — its location, its steps, its `params`. */
export type TRouter = {
  /** The part's location. */
  $location: Observable<TUrlProps>;
  $path: Observable<string>;
  $query: Observable<TParams>;
  getLocation(): TUrlProps;
  /** A new entry: `change.path` (or the current one) with `change.query` (no query when not given). */
  pushLocation(change: Partial<TUrlProps>): Promise<TUrlProps>;
  /** The current entry, changed the same way. */
  replaceLocation(change: Partial<TUrlProps>): Promise<TUrlProps>;
  /** One step back; `true` when it was taken. */
  backLocation(options?: TBackOptions): Promise<boolean>;
  /** The location's query as a key-value storage — `storeProvider`'s port too. */
  params: TKeyValueStorage<TParamsOptions>;
  /** The part this router works in. */
  historyPrimitive: THistoryPrimitive;
  /**
   * Hands the router's steps to `driver` (a navigator); returns how the driver shows a location it moved to. One
   * driver per router.
   */
  attach(driver: TRouterDriver): (location: TUrlProps) => void;
};

// ── the navigator ───────────────────────────────────────────────────────────────────────────────────────────────

/** What the navigator reads from a row of the route table; the rest of the row is the app's. */
export type TRouteRowBase = {
  /** The page stays mounted (hidden) while others cover it. */
  keep?: boolean;
  /** The row is this tab's root; the roots' order is the tabs' order. */
  section?: string;
};

/** A row of the route table: a path pattern and what the app puts there. */
export type TRouteRow<R = Record<string, unknown>> = [string, TRouteRowBase & R];

/** What a page renders with: its decoded parameters and its location. */
export type TPageRoute = {
  params: TParams;
  location: TUrlProps;
};

/** A page in the stack. */
export type TPageEntry<R = Record<string, unknown>> = {
  kind: 'page';
  id: number;
  depth: number;
  location: TUrlProps;
  /** Its row of the table (`null` until the host is made or when no row matches). */
  row: (TRouteRowBase & R) | null;
  /** The parameters its row's pattern gave, decoded. */
  params: TParams;
  /** The tab it belongs to (the tab it was opened in). */
  section: string | null;
  /** Restored after a reload and not shown since: in the stack, not mounted. */
  dormant: boolean;
};

/** A window in the stack. */
export type TWindowEntry = {
  kind: 'window';
  id: number;
  depth: number;
  /** What was opened (usually a component); `null` — its place restored after a reload, the window itself is gone. */
  window: unknown;
  params: unknown;
  /** `false`: the browser's Forward doesn't reopen it after it was closed (D-024). */
  reopen: boolean;
};

export type TEntry<R = Record<string, unknown>> = TPageEntry<R> | TWindowEntry;

/** The navigator's state. */
export type TNavigatorState<R = Record<string, unknown>> = {
  /** The top entry's place (windows count: each is a history entry). */
  depth: number;
  /** The shown page's location. */
  location: TUrlProps;
  /** Pages and windows, bottom to top; `entries[i].depth === i`. */
  entries: readonly TEntry<R>[];
  /** Windows just closed — still rendered (closed) while they play their exit. */
  leaving: readonly TWindowEntry[];
  /** Entries left by going back that the browser's Forward brings back, nearest first. */
  ahead: readonly TEntry<R>[];
  /** Mounted page layers of every tab (the shown page and the kept ones), in creation order. */
  layers: readonly TPageEntry<R>[];
  /** The shown page. */
  page: TPageEntry<R>;
  /** The tab shown; `null` without tabs. */
  section: string | null;
};

/** Options of `nav.open`. */
export type TOpenOptions = {
  /** Reopen the window when the player goes Forward after closing it (default `true`; `false` for confirmations). */
  reopen?: boolean;
};

/** Options of `nav.leavePage`. */
export type TLeavePageOptions = {
  /** Where to go when the stack has no earlier page. */
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

/** The navigator's dependencies: the router, the observable adapter, the view library (React, Preact, …), settings. */
export type TNavigatorDeps = TObservableAdapter & {
  router: TRouter;
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
  Component: any;
  useEffect: (...args: any[]) => void;
  useState: (...args: any[]) => any;
  useRef: (...args: any[]) => any;
  createContext: (...args: any[]) => any;
  useContext: (...args: any[]) => any;
  /** How many covered pages stay mounted at most (default 10). */
  keep?: number;
  /** How long a closed window plays its exit, ms (default 300). */
  exitMs?: number;
};

/** What `nav.NavigationHostProvider` takes. */
export type TNavigationHostOptions<R = Record<string, unknown>> = {
  /** The route table: the only description of the pages. */
  routes: readonly TRouteRow<R>[];
  /** A page from its row (default: `createElement(row.main, { route })`). */
  render?: (row: TRouteRowBase & R, route: TPageRoute, entry: TPageEntry<R>) => unknown;
  /** A page no row matches (default: nothing). */
  renderMissing?: (route: TPageRoute, entry: TPageEntry<R>) => unknown;
  /** A window (default: `createElement(entry.window, props)`). */
  renderWindow?: (entry: TWindowEntry, props: TWindowProps) => unknown;
};
