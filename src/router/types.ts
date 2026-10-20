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
import type {
  PAGE,
  WINDOW,
} from './constants';

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
  /**
   * Whether a move by `delta` stays on the timeline: not before its first entry, not past the last one known (entries
   * ahead made before a reload count once they've been seen).
   */
  canGo(delta: number): boolean;
  /** A move made by the code; resolves with the part in the entry arrived at. A move `canGo` refuses isn't made. */
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

/** Options of a step forward or in place (`pushLocation`, `replaceLocation`). */
export type TStepOptions = {
  /**
   * The history (and a navigator's stack) changes, the state isn't shown: `$location`, the pages and the hooks see
   * nothing until the next step that isn't quiet (D-042). Pages opened quietly aren't mounted until shown.
   */
  quiet?: boolean;
};

/** Options of a step back. */
export type TBackOptions = TStepOptions & {
  /** Don't ask the leave guards (sign out, a forced return). */
  force?: boolean;
};

/** Options of `params.set` / `remove` / `clear`. */
export type TParamsOptions = TStepOptions & {
  /** Change the current entry instead of making a new one. */
  replace?: boolean;
};

/** How a router's steps are carried out: by the primitive, or by a navigator over it. */
export type TRouterDriver = {
  push(location: TUrlProps, options?: TStepOptions): Promise<void>;
  replace(location: TUrlProps, options?: TStepOptions): Promise<void>;
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
  pushLocation(change: Partial<TUrlProps>, options?: TStepOptions): Promise<TUrlProps>;
  /** The current entry, changed the same way. */
  replaceLocation(change: Partial<TUrlProps>, options?: TStepOptions): Promise<TUrlProps>;
  /** One step back; `true` when it was taken (`false` at the history's first entry, or a leave guard refused). */
  backLocation(options?: TBackOptions): Promise<boolean>;
  /**
   * The location's query as a key-value storage — `storeProvider`'s port too. With a navigator a change is a step in
   * its queue: `get` reads the new value once the step is taken.
   */
  params: TKeyValueStorage<TParamsOptions>;
  /** The part this router works in. */
  historyPrimitive: THistoryPrimitive;
  /**
   * Hands the router's steps to `driver` (a navigator, or another driver of your own); returns how the driver shows a
   * location it moved to. One driver per router — a second `attach` is an error.
   */
  attach(driver: TRouterDriver): (location: TUrlProps) => void;
};

// ── the navigator ───────────────────────────────────────────────────────────────────────────────────────────────

/** What the navigator reads from a row of the route table; the rest of the row is the app's. */
export type TRouteRowBase = {
  /** The page stays mounted (hidden) while others cover it. */
  keep?: boolean;
  /**
   * The row is a section's root (a tab): a link to it from another section shows that section as it was left, a link
   * to it in the same section rolls the section back to its start. The first root is the start section.
   */
  section?: boolean;
  /**
   * A step that changes only the page's query doesn't re-render it (its `route` stays): its parts follow the query
   * through `router.params` (`storeProvider(deps, router.params)`).
   */
  quietQuery?: boolean;
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
  kind: typeof PAGE;
  /**
   * The page's identity: the entries of one page (its own steps — the same row, D-043) share it; its layer, hooks and
   * guards belong to it.
   */
  id: number;
  depth: number;
  location: TUrlProps;
  /** Its row of the table (`null` until the host is made or when no row matches). */
  row: (TRouteRowBase & R) | null;
  /** The parameters its row's pattern gave, decoded. */
  params: TParams;
  /** The section it belongs to — its root's pattern (a root's own; otherwise the section it was opened in). */
  section: string | null;
  /** Restored after a reload and not shown since: in the stack, not mounted. */
  dormant: boolean;
  /** Its leave guards are being asked: it may be left in a moment (a page can disable its buttons). */
  closing: boolean;
};

/** A window in the stack. */
export type TWindowEntry = {
  kind: typeof WINDOW;
  id: number;
  depth: number;
  /** What was opened (usually a component); `null` — its place restored after a reload, the window itself is gone. */
  window: unknown;
  params: unknown;
  /** `false`: the browser's Forward doesn't reopen it after it was closed (D-024). */
  reopen: boolean;
  /** Its leave guards are being asked. */
  closing: boolean;
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
  /** The section shown — its root's pattern (`'/feed'`); `null` without sections. */
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
  useEffect: (...args: any[]) => void;
  useState: (...args: any[]) => any;
  useRef: (...args: any[]) => any;
  createContext: (...args: any[]) => any;
  useContext: (...args: any[]) => any;
  /** How many covered pages stay mounted at most (default `DEFAULT_KEEP`, 10). */
  keep?: number;
  /** How long a closed window plays its exit, ms (default `DEFAULT_EXIT_MS`, 300). */
  exitMs?: number;
};

/** What `nav.NavigationHostProvider` takes. */
export type TNavigationHostOptions<R = Record<string, unknown>> = {
  /** The route table: the only description of the pages ("not found" — a catch-all last row, `/(.*)`). */
  routes: readonly TRouteRow<R>[];
  /** A page from its row (default: `createElement(row.main, { route })`); a path no row fits draws nothing. */
  render?: (row: TRouteRowBase & R, route: TPageRoute, entry: TPageEntry<R>) => unknown;
  /** A window (default: `createElement(entry.window, props)`). */
  renderWindow?: (entry: TWindowEntry, props: TWindowProps) => unknown;
};
