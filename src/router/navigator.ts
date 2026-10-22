// The navigator (fundamentool D-038, D-039): pages and windows over a router — a stack in step with the router's part
// of the history: every page and every window is an entry, so Back closes the top one; Forward brings back what Back
// left (D-024); covered pages can stay mounted; tabs keep their own histories; the stack survives a reload.
import {
  createTimeout,
} from '../createTimeout';
import {
  isArray,
} from '../is/isArray';
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
  keyedRegistry,
} from '../keyedRegistry';
import {
  isStore,
} from '../Observable';
import {
  viewLibraryShape,
} from '../view/library';
import {
  array,
  boolean,
  custom,
  func,
  number,
  object,
  record,
  union,
} from '../schema';
import {
  LOCATION,
  ROUTER,
} from './schemas';
import {
  queueProvider,
} from '../queueProvider';
import {
  urlParse,
} from '../urlParse';
import type {
  TUrlProps,
} from '../urlParse';
import {
  DEFAULT_EXIT_MS,
  DEFAULT_KEEP,
  PAGE,
  WINDOW,
} from './constants';
import {
  locate,
  pathPrefix,
} from './location';
import {
  computeState,
  pageAt,
  pageIndexAt,
  topPage,
} from './navigatorState';
import {
  createNavigatorView,
} from './navigatorView';
import {
  BACK_OPTIONS,
  STEP_OPTIONS,
} from './options';
import {
  fixedPathOf,
  routeTableMatcher,
} from './routeTable';
import type {
  TRouteMatch,
} from './routeTable';
import type {
  TStore,
  Unsubscribe,
} from '../Observable/types';
import type {
  TBackOptions,
  TEnterGuard,
  TEntry,
  TGate,
  THistoryEntry,
  TForwardHandler,
  TLeaveGuard,
  TNavigatorDeps,
  TNavigatorState,
  TOpenOptions,
  TPageEntry,
  TRouteRow,
  TRouteRowBase,
  TStepOptions,
  TWindowEntry,
} from './types';

const WHERE = '[fundamentool] createNavigator';

/** A gate (D-050): its store and its first page. */
const GATE = object({
  closed: custom<TStore<boolean>>(isStore, 'a store of true / false (getState + watch)'),
  to: LOCATION.describe('its first page ({ path, … })'),
}).describe('{ closed, to }').label((_gate, name) => `the gate "${name}"`);

/** `createNavigator`'s options (D-051): the router, the observable adapter, the view library, the settings. */
const NAVIGATOR_DEPS = object({
  router: ROUTER,
  createObservable: func(),
  createApi: func(),
  ...viewLibraryShape([
    'createElement',
    'forwardRef',
    'useSyncExternalStore',
    'useEffect',
    'useRef',
    'createContext',
    'useContext',
  ]),
  keep: number().min(0).optional(),
  exitMs: number().min(0).optional(),
  fallback: LOCATION.optional(),
  gates: record(GATE).describe('{ [name]: { closed, to } }').optional(),
});

/** The single list of `createNavigator`'s keys. */
export const NAVIGATOR_DEPS_KEYS = NAVIGATOR_DEPS.keys;

/** The single list of a gate's keys (D-050). */
export const GATE_KEYS = GATE.keys;

/** `open`'s options. */
const OPEN_OPTIONS = object({
  reopen: boolean().optional(),
});

/** The single list of `open`'s option keys. */
export const OPEN_OPTION_KEYS = OPEN_OPTIONS.keys;

/** `startOver`'s argument: a location, or a non-empty list of them. */
const START_OVER = union([
  LOCATION,
  array(LOCATION).refine((list) => list.length > 0, 'an empty list'),
]).describe('a location ({ path, query, … }) or a non-empty list of them');

/** `backToDepth`'s depth. */
const DEPTH = number().int().min(0).describe('a depth (a whole number ≥ 0)');

/** What an entry guard answers. */
const ENTER_ANSWER = union([
  boolean(),
  LOCATION,
]).describe('true, false or a location ({ path, … })');

/** At most this many redirects of the entry guards in a row — more is a loop. */
const MAX_REDIRECTS = 10;

/** A gate as the navigator keeps it: its name, its store (`true` — closed), its first page. */
type TGateItem = [name: string, closed: TStore<boolean>, to: Partial<TUrlProps>];

/** An entry as the history keeps it (to rebuild the stack after a reload): a page's address and tab, a window's place. */
type TSaved = [kind: typeof PAGE, id: number, href: string, section: string | null, historyIndex: number]
  | [kind: typeof WINDOW, id: number, historyIndex: number];

/** An entry's place in the history before it is written. */
const NOT_WRITTEN = -1;

/** The shape of what the navigator writes into an entry; a new shape — a new number (older entries start the stack anew). */
const NAV_FORMAT = 2;

/** What the navigator writes into its part of an entry: the entry and the whole stack it closes. */
type TNavData = {
  nav: typeof NAV_FORMAT;
  id: number;
  depth: number;
  /** The shown stack, bottom to this entry. */
  stack: TSaved[];
  /** The tab shown, and the other tabs' stacks. */
  shown: string | null;
  tabs: Record<string, TSaved[]>;
  /** The location held behind a closed gate (D-050), its address; left out — none. */
  held?: string;
};

/** How a step back ended: `left` settles `true` when the entries were left, `false` when a guard kept them. */
type TOutcome = {
  left: Promise<boolean>;
};

const LEFT: TOutcome = {
  left: Promise.resolve(true),
};
const STAYED: TOutcome = {
  left: Promise.resolve(false),
};

/** An effect running while its entry is open, and the cleanup it returned last. */
type TOpenedEffect = {
  effect: () => void | (() => void);
  cleanup: (() => void) | void;
};

/** A forward handler and whether windows trigger it too. */
type TForwardItem = {
  handler: TForwardHandler;
  windows: boolean;
};

function isNavData(value: unknown): value is TNavData {
  return isObject(value) && (value as TNavData).nav === NAV_FORMAT && isNumber((value as TNavData).depth);
}

/**
 * Pages and windows over a router (fundamentool D-038): the router's steps become pages (`router.pushLocation` opens
 * one, `router.backLocation` closes the top entry asking its leave guards); `open` puts a window over the page. The
 * route table goes to the host (`NavigationHostProvider({ routes })`), made where the pages are imported.
 *
 * @example
 * const nav = createNavigator({ router, createObservable, createApi, ...reactDeps });
 * const NavigationHost = nav.NavigationHostProvider({ routes: [['/', { main: Home, keep: true }]] });
 * const answer = await nav.open(ConfirmWindow, { text: 'Quit?' });
 */
export function createNavigator(deps: TNavigatorDeps) {
  NAVIGATOR_DEPS.parse(deps, WHERE);
  const {
    router,
    createObservable,
    createApi,
  } = deps;
  const primitive = router.historyPrimitive;
  // `0` is a limit too (no covered page stays mounted), so only a missing value takes the default.
  const keepLimit = deps.keep ?? DEFAULT_KEEP;
  const exitMs = deps.exitMs ?? DEFAULT_EXIT_MS;

  // ── the table (given by the host) ──────────────────────────────────────────────────────────────────────────────

  let match: (path: string) => TRouteMatch<Record<string, unknown>> | null = () => null;
  /** The sections' root rows → the section's key, the root's pattern (D-043: a row is marked, not named). */
  let rootKeys = new Map<TRouteRowBase, string>();
  /** The roots as `sectionOf` reads a deep link: the key, the root's fixed path, what the paths under it start with. */
  let roots: [key: string, path: string, prefix: string][] = [];
  /** The start section — the first root; its root (a fixed path) is put under every deep link. */
  let homeSection: string | null = null;
  let homeRoot: TUrlProps | null = null;

  // ── arriving (D-050) ──────────────────────────────────────────────────────────────────────────────────────────

  /** The gates, in the order given: the name, the store (`true` — closed), the first page. */
  const gates: TGateItem[] = Object.keys(deps.gates || {}).map((name) => {
    const gate = (deps.gates as Record<string, TGate>)[name];
    return [
      name,
      gate.closed,
      gate.to,
    ];
  });
  /** The entry guards, in the order registered (an item each: one guard may be registered twice). */
  const enterGuards: { guard: TEnterGuard }[] = [];
  /** The location held behind a closed gate; `null` — none. */
  let held: TUrlProps | null = null;
  /** The route table has come (the host is made): from then on the gates hold, and the start was checked. */
  let routed = false;
  /** The first visit's page — the stack is still a first visit while it is the only one. */
  let firstId = 0;

  // ── the stack ─────────────────────────────────────────────────────────────────────────────────────────────────

  let nextId = 1;
  let entries: TEntry[] = [];
  let leaving: TWindowEntry[] = [];
  /** Entries left by going back, nearest first — what the browser's Forward restores (D-024). */
  let ahead: TEntry[] = [];
  /** Each section's own stack, and the section shown (`null` without sections). */
  const stacks = new Map<string, TEntry[]>();
  let shown: string | null = null;
  /** The step being made is quiet (D-042): the history and the stack change, the state isn't published. */
  let quietStep = false;

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
  /** The other tabs' stacks as the history keeps them; they change only when the stacks are laid out anew. */
  let hiddenTabs: Record<string, TSaved[]> | null = null;

  /** The section whose root a location is (`null` — not a root, or no sections). */
  function rootOf(location: TUrlProps): string | null {
    const found = match(location.path);
    return found ? rootKeys.get(found.row) ?? null : null;
  }

  /**
   * A page entry: its row and parameters from the table, its section — its own if it is a root, otherwise the one it's
   * opened in. `id` — the page it is a step of (D-043); a new page otherwise. Opened by a quiet step — dormant.
   */
  function page(
    location: TUrlProps, depth: number, section: string | null = shown, id?: number,
  ): TPageEntry {
    const found = match(location.path);
    return {
      kind: PAGE,
      id: id || nextId++,
      depth,
      location,
      row: found ? found.row : null,
      params: found ? found.params : {},
      section: (found && rootKeys.get(found.row)) ?? section,
      dormant: quietStep,
      confirmingLeave: false,
      // A step of a page that has a guard keeps the fact
      leaveGuarded: !!id && guards.has(id),
      historyIndex: NOT_WRITTEN,
    };
  }

  /** The shown page, when `location` is a step of it — the same row, no window over it (D-043). */
  function samePage(location: TUrlProps): TPageEntry | null {
    const top = entries[entries.length - 1];
    if (top.kind !== PAGE || !top.row) {
      return null;
    }
    const found = match(location.path);
    return found && found.row === top.row ? top : null;
  }

  /** Of the entries above the kept top, those of other pages: the kept page's own steps aren't it being left. */
  function leftBy(removed: readonly TEntry[], kept: TEntry): TEntry[] {
    return removed.filter((entry) => entry.id !== kept.id);
  }

  /** Runs a step's work quiet or not (D-042); inside the queue. */
  async function quietly<T>(quiet: boolean, work: () => Promise<T> | T): Promise<T> {
    quietStep = quiet;
    try {
      return await work();
    } finally {
      quietStep = false;
    }
  }

  // ── state ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /** The shown stack goes into its tab's place. */
  function storeShown(): void {
    if (shown !== null) {
      stacks.set(shown, shown === homeSection ? entries : entries.slice(1));
    }
  }

  /** The stack as the state. The page on top is shown: restored after a reload (or opened quietly), it wakes up now. */
  function snapshot(): TNavigatorState {
    const topIndex = pageIndexAt(entries, entries.length - 1);
    const top = entries[topIndex] as TPageEntry;
    if (top.dormant) {
      entries = [
        ...entries.slice(0, topIndex),
        {
          ...top,
          dormant: false,
        },
        ...entries.slice(topIndex + 1),
      ];
    }
    return computeState({
      entries,
      leaving,
      ahead,
      stacks,
      shown,
      keepLimit,
      anyLeaveGuarded: anyLeaveGuarded(),
      held,
    });
  }

  /**
   * The stack as the state, emitted; the router shows the top page's location. A quiet step publishes nothing — only
   * the router's actual location follows it (D-045).
   */
  function publish(): void {
    storeShown();
    if (quietStep) {
      showLocation(pageAt(entries, entries.length - 1).location, true);
      return;
    }
    state = snapshot();
    emitState(state);
    showLocation(state.location);
  }

  /** Some entry of the stack shown or of another section has a leave guard. */
  function anyLeaveGuarded(): boolean {
    if (entries.some((entry) => entry.leaveGuarded)) {
      return true;
    }
    for (const list of stacks.values()) {
      if (list.some((entry) => entry.leaveGuarded)) {
        return true;
      }
    }
    return false;
  }

  /**
   * The page or window `id` got its first leave guard or lost its last: its entries — in the stack shown and in the
   * sections' stacks — carry the fact, and the state is published (D-049).
   */
  function refreshLeaveGuarded(id: number): void {
    const guarded = guards.has(id);
    const mark = (entry: TEntry): TEntry => (entry.id === id && entry.leaveGuarded !== guarded ? {
      ...entry,
      leaveGuarded: guarded,
    } : entry);
    entries = entries.map(mark);
    for (const [
      name,
      list,
    ] of stacks) {
      stacks.set(name, list.map(mark));
    }
    publish();
  }

  /** Marks the entries `ids` names as having their leave guards asked (or not); the state isn't emitted. */
  function markConfirming(ids: ReadonlySet<number>, confirming: boolean): void {
    entries = entries.map((entry) => (ids.has(entry.id) && entry.confirmingLeave !== confirming ? {
      ...entry,
      confirmingLeave: confirming,
    } : entry));
  }

  // ── sections ──────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * The section a deep link belongs to: the one it is the root of; otherwise the one with the longest fixed root path
   * that is its path or starts it (a root `/` takes what no other does); otherwise the start section.
   */
  function sectionOf(location: TUrlProps): string {
    const own = rootOf(location);
    if (own !== null) {
      return own;
    }
    const path = location.path;
    let found = homeSection as string;
    let longest = -1;
    for (const [
      name,
      root,
      prefix,
    ] of roots) {
      if ((path === root || path.startsWith(prefix)) && root.length > longest) {
        found = name;
        longest = root.length;
      }
    }
    return found;
  }

  /** What the history holds for a section — the start section's root under it, then its stack. */
  function layout(section: string): TEntry[] {
    const home = homeSection as string;
    if (!stacks.has(home)) {
      stacks.set(home, [
        page(
          homeRoot as TUrlProps, 0, home,
        ),
      ]);
    }
    const list = section === home
      ? stacks.get(home) as TEntry[]
      : [
        (stacks.get(home) as TEntry[])[0],
        ...(stacks.get(section) as TEntry[]),
      ];
    return list.map((entry, depth) => (entry.depth === depth ? entry : {
      ...entry,
      depth,
    }));
  }

  /** The history is at its first entry — write a tab's stack into it and show it. */
  function rebuild(section: string): void {
    const list = layout(section);
    const length = list.length;
    shown = section;
    hiddenTabs = null;
    entries = list.slice(0, 1);
    // Each written entry keeps its place in the history: the next slice is cut from the list that has it
    list[0] = write(list[0], true);
    for (let i = 1; i < length; i++) {
      entries = list.slice(0, i + 1);
      list[i] = write(list[i], false);
    }
    ahead = [];
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
    closeOpened(windows);
    entries = entries.slice(0, first);
    for (const entry of windows) {
      forget(entry);
      resolve(entry, null);
    }
  }

  // ── the history ───────────────────────────────────────────────────────────────────────────────────────────────

  function saved(entry: TEntry): TSaved {
    return entry.kind === PAGE ? [
      PAGE,
      entry.id,
      entry.location.href,
      entry.section,
      entry.historyIndex,
    ] : [
      WINDOW,
      entry.id,
      entry.historyIndex,
    ];
  }

  /** The other tabs' stacks as the history keeps them — computed once after they were laid out. */
  function savedTabs(): Record<string, TSaved[]> {
    if (!hiddenTabs) {
      hiddenTabs = {};
      for (const [
        name,
        list,
      ] of stacks) {
        if (name !== shown) {
          hiddenTabs[name] = list.map(saved);
        }
      }
    }
    return hiddenTabs;
  }

  /**
   * Writes `entry` (the top of `entries`) into the router's part: a new entry or the current one. The entry learns its
   * place in the history (`historyIndex`) — set in `entries` and returned. The entry's own place, written in its data
   * too, is the one it is being written at.
   */
  function write(entry: TEntry, replace: boolean): TEntry {
    const depth = entry.depth;
    const historyIndex = primitive.current().index + (replace ? 0 : 1);
    const placed = entry.historyIndex === historyIndex ? entry : {
      ...entry,
      historyIndex,
    };
    entries[depth] = placed;
    const data: TNavData = {
      nav: NAV_FORMAT,
      id: entry.id,
      depth,
      stack: entries.slice(0, depth + 1).map(saved),
      shown,
      tabs: savedTabs(),
    };
    if (held !== null) {
      data.held = held.href;
    }
    (replace ? primitive.replace : primitive.push)(pageAt(entries, depth).location, data);
    return placed;
  }

  /** Entries rebuilt from what the history kept: pages dormant (not mounted until reached), windows gone. */
  function fromSaved(list: readonly TSaved[]): TEntry[] {
    return list.map((item, depth) => {
      nextId = Math.max(nextId, item[1] + 1);
      if (item[0] === WINDOW) {
        return {
          kind: WINDOW,
          id: item[1],
          depth,
          window: null,
          params: undefined,
          reopen: false,
          confirmingLeave: false,
          leaveGuarded: false,
          historyIndex: item[2],
        };
      }
      return {
        ...page(
          urlParse(item[2]), depth, item[3], item[1],
        ),
        dormant: true,
        historyIndex: item[4],
      };
    });
  }

  /** The stack from an entry the history kept (a reload, or a move to an entry we don't hold); not yet published. */
  function restore(data: TNavData): void {
    const dropped = [
      ...entries,
      ...[...stacks.values()].flat(),
    ];
    closeOpened(entries);
    stacks.clear();
    hiddenTabs = null;
    shown = data.shown;
    for (const name of Object.keys(data.tabs)) {
      stacks.set(name, fromSaved(data.tabs[name]));
    }
    entries = fromSaved(data.stack);
    held = typeof data.held === 'string' ? urlParse(data.held) : null;
    ahead = [];
    for (const entry of dropped) {
      forget(entry);
      entry.kind === WINDOW && resolve(entry, null);
    }
  }

  /** A move made by the code to the history's entry at `index`; resolves with the part in the entry arrived at. */
  const travelToIndex = (index: number): Promise<THistoryEntry> => primitive.go(index - primitive.current().index);

  /**
   * Back to the entry of the stack at `depth` as it was left: the history's last place before the entry above it — by
   * places, not by counting: another router's entries (an inner part's steps) may lie between the navigator's own, and
   * those of `depth` stay (C8, D-049).
   */
  const travelBelow = (depth: number): Promise<THistoryEntry> => travelToIndex(entries[depth + 1].historyIndex - 1);

  /** To the very first entry of the stack — what follows is dropped (a start over, a section laid out anew). */
  const travelToStart = (): Promise<THistoryEntry> => travelToIndex(entries[0].historyIndex);

  /** One step at a time, in call order (fundamentool's `queueProvider`). */
  const queue = queueProvider()((work: () => unknown) => work());
  const enqueue = <T>(work: () => Promise<T> | T): Promise<T> => queue(work) as Promise<T>;

  // ── stack changes ─────────────────────────────────────────────────────────────────────────────────────────────

  /** The `whileOpen` effects of the entries are cleaned up, top entry first: they start being left. */
  function closeOpened(list: readonly TEntry[]): void {
    for (let i = list.length - 1; i >= 0; i--) {
      for (const item of opened.list(list[i].id)) {
        const cleanup = item.cleanup;
        item.cleanup = undefined;
        isFunction(cleanup) && cleanup();
      }
    }
  }

  /** The `whileOpen` effects of the entries run again, top entry first: leaving them was refused. */
  function reopenOpened(list: readonly TEntry[]): void {
    for (let i = list.length - 1; i >= 0; i--) {
      for (const item of opened.list(list[i].id)) {
        item.cleanup = item.effect();
      }
    }
  }

  function forget(entry: TEntry): void {
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
    // What is left isn't being left any more (Forward may bring it back); a page left has no guards any more (forgotten).
    const kept = entries[depth].id;
    const removed = entries.slice(depth + 1).map((entry) => (entry.confirmingLeave || entry.leaveGuarded && entry.id !== kept ? {
      ...entry,
      confirmingLeave: false,
      leaveGuarded: entry.leaveGuarded && entry.id === kept,
    } : entry));
    entries = entries.slice(0, depth + 1);
    // What was left goes ahead (Forward brings it back), up to a window that isn't reopened (D-024).
    const stop = removed.findIndex((entry) => entry.kind === WINDOW && !entry.reopen);
    ahead = stop < 0 ? [
      ...removed,
      ...ahead,
    ] : removed.slice(0, stop);
    const windows = removed.filter((entry): entry is TWindowEntry => entry.kind === WINDOW);
    for (const entry of leftBy(removed, entries[depth])) {
      forget(entry);
    }
    leaving = [
      ...leaving,
      ...windows.filter((entry) => entry.window !== null),
    ];
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

  /** Windows restored after a reload have nothing to show: Back passes their entries with one more step. */
  async function passGoneWindows(): Promise<void> {
    let top = entries[entries.length - 1];
    while (top.kind === WINDOW && top.window === null) {
      await travelBelow(entries.length - 2);
      removeAbove(entries.length - 2);
      top = entries[entries.length - 1];
    }
  }

  /**
   * The history is now at `entry` — make the stack match. Going back past entries with leave guards: step forward
   * again — to `from`, the place the move started at — ask the guards (they may open windows, so outside the queue),
   * and leave as far as they agree. `force` — the guards aren't asked.
   */
  async function settle(
    entry: THistoryEntry, from: number, force = false,
  ): Promise<TOutcome> {
    const data = entry.data;
    if (!isNavData(data)) {
      if (entry.index > entries[entries.length - 1].historyIndex) {
        // An address from outside (a typed hash, a plain anchor) ahead of the shown page: back where the player was, and
        // the step taken as any step of the app — over the shown page, asked like one (D-050)
        await travelToIndex(from);
        void go(entry.location);
        return STAYED;
      }
      reset(entry.location);
      publish();
      return LEFT;
    }
    const current = entries.length - 1;
    const target = data.depth;
    if (target > current) {
      return forwardTo(
        target, data, entry.index, from,
      );
    }
    if (entries[target]?.id !== data.id) {
      // An entry of a stack we don't hold (written before a reload): the stack is what it kept.
      restore(data);
      await showRestored();
      return LEFT;
    }
    /* istanbul ignore next -- the history never reports the entry it is already on */
    if (target === current) {
      return STAYED;
    }
    if (shown !== null && target === 0 && shown !== homeSection) {
      // Back past a section's first entry: that section keeps it, the start section is shown.
      const removed = leftBy(entries.slice(2), entries[1]);
      closeOpened(removed);
      if (!force && removed.some((item) => guards.has(item.id))) {
        await travelToIndex(from);
        return {
          left: confirmLeave(1, removed),
        };
      }
      removeAbove(1);
      rebuild(homeSection as string);
      return LEFT;
    }
    const removed = leftBy(entries.slice(target + 1), entries[target]);
    closeOpened(removed);
    if (force || !removed.some((item) => guards.has(item.id))) {
      removeAbove(target);
      await passGoneWindows();
      return LEFT;
    }
    await travelToIndex(from);
    // Asked outside the queue (a guard may open a window); the caller may wait for the answer through `left`.
    return {
      left: confirmLeave(target, removed),
    };
  }

  /**
   * Asks the guards of `removed`, top entry first; meanwhile they are `confirmingLeave` in the state. All agree — go to
   * `target`. One refuses — stop at its entry: what was above it is left, it and what is below stay (their `whileOpen`
   * effects run again).
   */
  async function confirmLeave(target: number, removed: readonly TEntry[]): Promise<boolean> {
    markConfirming(new Set(removed.map((entry) => entry.id)), true);
    publish();
    let stop = target;
    const asked = new Set<number>();
    // Top first; a page with several entries is asked once, at its top entry — where it stays if it refuses.
    for (let i = removed.length - 1; i >= 0 && stop === target; i--) {
      const entry = removed[i];
      if (asked.has(entry.id)) {
        continue;
      }
      asked.add(entry.id);
      for (const guard of guards.list(entry.id)) {
        if (!(await guard())) {
          stop = entry.depth;
          break;
        }
      }
    }
    const staying = removed.filter((entry) => entry.depth <= stop);
    reopenOpened(staying);
    if (staying.length) {
      markConfirming(new Set(staying.map((entry) => entry.id)), false);
      publish();
    }
    return enqueue(async () => {
      const current = entries.length - 1;
      if (current <= stop) {
        return false; // the stack changed while the guards were asked: nothing more to leave
      }
      await travelBelow(stop);
      removeAbove(stop);
      return stop === target;
    });
  }

  /**
   * The history went Forward to `target` (D-024): the entries ahead come back — pages with their address, windows
   * reopened (nobody awaits them). An entry we don't keep ahead (after a reload) — the stack the history kept, its
   * windows passed. Forward handlers of the current top are asked first (outside the queue: they may open windows).
   */
  async function forwardTo(
    target: number, data: TNavData, arrived: number, from: number,
  ): Promise<TOutcome> {
    const current = entries.length - 1;
    const count = target - current;
    const back = ahead.slice(0, count);
    if (back.length < count || back[count - 1].id !== data.id) {
      const ours = data.stack.slice(0, current + 1).every((item, depth) => item[1] === entries[depth].id);
      if (ours && data.stack.slice(current + 1).some((item) => item[0] === WINDOW)) {
        // Our own stack with windows ahead we don't keep (they come back only from `ahead`): the move is undone.
        await travelToIndex(from);
        return STAYED;
      }
      // Pages we don't hold (after a reload): the stack the history kept.
      restore(data);
      await showRestored();
      return LEFT;
    }
    const kind = back[0].kind;
    // A step of the shown page coming back isn't something opening over it.
    if (back[0].id === entries[current].id || !hasForward(kind)) {
      restoreAhead(back);
      return LEFT;
    }
    await travelToIndex(from);
    void askForward(kind).then((go) => (go ? enqueue(async () => {
      if (entries.length - 1 === current && ahead[count - 1] === back[count - 1]) {
        await travelToIndex(arrived);
        restoreAhead(back);
      }
    }) : undefined));
    return STAYED;
  }

  function restoreAhead(back: readonly TEntry[]): void {
    ahead = ahead.slice(back.length);
    const ids = new Set(back.map((entry) => entry.id));
    leaving = leaving.filter((entry) => !ids.has(entry.id));
    entries = [
      ...entries,
      ...back,
    ];
    publish();
  }

  /** Drops the stack and starts it at `location` (with tabs: over the start tab's root); not yet published. */
  function reset(location: TUrlProps): void {
    const dropped = [
      ...entries,
      ...[...stacks].filter(([name]) => name !== shown).flatMap(([, list]) => list),
    ];
    closeOpened(entries);
    stacks.clear();
    hiddenTabs = null;
    if (homeSection !== null) {
      shown = sectionOf(location);
      stacks.set(shown, [
        page(
          location, 0, shown,
        ),
      ]);
      const list = layout(shown);
      entries = list.slice(0, 1);
      list[0] = write(list[0], true);
      if (list.length > 1) {
        entries = list;
        write(list[1], false);
      }
    } else {
      entries = [page(location, 0)];
      write(entries[0], true);
    }
    ahead = [];
    for (const entry of dropped) {
      forget(entry);
      entry.kind === WINDOW && resolve(entry, null);
    }
  }

  /** Does the top entry have forward handlers for this kind of step? */
  function hasForward(kind: TEntry['kind']): boolean {
    return forward.list(entries[entries.length - 1].id).some((item) => kind === PAGE || item.windows);
  }

  /** Asks the forward handlers of the top entry; `false` — cancelled. Runs outside the queue (handlers may open windows). */
  async function askForward(kind: TEntry['kind']): Promise<boolean> {
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
    const before = entries;
    entries = [
      ...entries,
      entry,
    ];
    try {
      write(entry, false);
    } catch (error) {
      entries = before;
      throw error;
    }
    ahead = []; // a new step forgets what was ahead, as the browser does
    publish();
  }

  // ── steps ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * A step forward. A section's root — that section (`toSection`). A step of the shown page (the same row) — a new
   * entry of the same page: it stays mounted and gets the new `route` (D-043). Otherwise a new page; forward handlers
   * are asked first — outside the queue, they may open windows; with none, the step takes its place in the queue at
   * once, so steps keep their call order.
   */
  async function go(change: TUrlProps, options?: TStepOptions): Promise<boolean> {
    const quiet = !!options?.quiet;
    const before = held;
    const admitted = admit(change);
    if (admitted === null) {
      await keepHeld(before);
      return false;
    }
    const location = admitted.location;
    if (admitted.gated) {
      await enqueue(() => startOverIn([location], quiet));
      return true;
    }
    const root = rootOf(location);
    if (root !== null) {
      await toSection(
        root, location, quiet,
      );
      return true;
    }
    if (!samePage(location) && hasForward(PAGE) && !(await askForward(PAGE))) {
      return false;
    }
    await enqueue(() => quietly(quiet, () => {
      const same = samePage(location);
      push(page(
        location, entries.length, same ? same.section : shown, same?.id,
      ));
    }));
    return true;
  }

  /**
   * The shown page's place takes `location` — no new history entry; windows over it close first (their guards are
   * asked). The same row — the same page with a new `route`; another row — a new page in its place. Inside the queue.
   */
  async function replaceTop(location: TUrlProps): Promise<void> {
    const current = entries.length - 1;
    const index = pageIndexAt(entries, current);
    if (index < current) {
      const from = primitive.current().index;
      await settle(await travelBelow(index), from);
      if (entries.length - 1 !== index) {
        return; // a window's guard kept it open
      }
    }
    const old = entries[index] as TPageEntry;
    const same = samePage(location);
    if (!same) {
      closeOpened([old]);
      forget(old);
    }
    const fresh = page(
      location, index, old.section, same?.id,
    );
    entries = [
      ...entries.slice(0, index),
      fresh,
    ];
    write(fresh, true);
    ahead = [];
    publish();
  }

  async function replace(change: TUrlProps, options?: TStepOptions): Promise<void> {
    const quiet = !!options?.quiet;
    const before = held;
    const admitted = admit(change);
    if (admitted === null) {
      await keepHeld(before);
      return;
    }
    const location = admitted.location;
    await enqueue(() => (admitted.gated ? startOverIn([location], quiet) : quietly(quiet, () => replaceTop(location))));
  }

  /**
   * Drops every page and window and lays the history out anew from its first entry (D-050): `change` alone — sign out,
   * switching account — or a list, bottom to top, each located against the one before: every page but the last is
   * dormant, only the last is shown, nothing on the way. A section's root can only be first (it decides the section).
   * `quiet` — nothing shown until the next step. The last page is asked as any step's (the gates, the entry guards).
   *
   * @example
   * await nav.startOver({ path: '/signin' });
   * await nav.startOver([{ path: '/' }, { path: '/place/5' }]); // the place shown; Back goes home
   */
  async function startOver(change: Partial<TUrlProps> | readonly Partial<TUrlProps>[], options?: TStepOptions): Promise<void> {
    START_OVER.parse(change, `${WHERE} startOver`);
    const list = isArray(change) ? change : [change];
    STEP_OPTIONS.parse(options, `${WHERE} startOver`);
    const locations: TUrlProps[] = [];
    let base = topPage(entries).location;
    for (const item of list) {
      base = locate(item, base);
      if (locations.length && rootOf(base) !== null) {
        throw new TypeError(`${WHERE} startOver: "${base.path}" is a section's root — it can only be first (the first location decides the section)`);
      }
      locations.push(base);
    }
    const before = held;
    const last = locations.length - 1;
    const admitted = admit(locations[last]);
    if (admitted === null) {
      await keepHeld(before);
      return;
    }
    const target = admitted.gated ? [admitted.location] : [
      ...locations.slice(0, last),
      admitted.location,
    ];
    await enqueue(() => startOverIn(target, !!options?.quiet));
  }

  /**
   * Opens a window over the current entry (a history entry: Back closes it); resolves its result, `null` if dismissed.
   * The browser's Forward reopens it after it was closed, unless `{ reopen: false }` (confirmations — D-024).
   */
  async function open<R = unknown>(
    win: unknown,
    params?: unknown,
    options?: TOpenOptions,
  ): Promise<R | null> {
    OPEN_OPTIONS.optional().parse(options, `${WHERE} open`);
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
          confirmingLeave: false,
          leaveGuarded: false,
          historyIndex: NOT_WRITTEN,
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
      if (result !== undefined) {
        results.set(entryId, result);
      }
      const from = primitive.current().index;
      await settle(await travelBelow(entry.depth - 1), from);
    });
  }

  /**
   * Back in one move to the depth `target` gives for the stack as it is when the step's turn comes; the guards of the
   * entries left are asked, top first — a refusal stops there; `force` — they aren't asked. Resolves `true` when the
   * stack is at that depth (left to it, or there already).
   */
  async function backTo(
    target: (current: number) => number, force: boolean, quiet = false,
  ): Promise<boolean> {
    const outcome = await enqueue(() => quietly(quiet, async () => {
      const current = entries.length - 1;
      const wanted = target(current);
      const depth = Math.max(0, wanted);
      if (depth < current) {
        const from = primitive.current().index;
        return settle(
          await travelBelow(depth), from, force,
        );
      }
      return wanted === current ? LEFT : STAYED; // there already — or nothing to go back to
    }));
    return outcome.left;
  }

  /** The place of the shown section's first entry (its root, unless it was opened by a deep link); `0` without sections. */
  const sectionStart = (): number => (shown === null || shown === homeSection ? 0 : 1);

  /**
   * Back in one move to the start of the shown section — its first entry; without sections, the first page; the leave
   * guards of what is left are asked. Takes no arguments — a handler as it is (`onClick={nav.backToRoot}`, D-045).
   * Resolves `true` when it is there.
   */
  const backToRoot = (): Promise<boolean> => backTo(sectionStart, false);

  /**
   * Back in one move to `depth` (`0` — the very first page, whatever the section). `force` — the leave guards aren't
   * asked (sign out, D-026); `quiet` — nothing is shown until the next step (D-042). Resolves `true` when it is there.
   *
   * @example
   * await nav.backToDepth(0, { force: true, quiet: true }); // sign out: back to the start, nothing shown on the way
   * await nav.open(SignIn);
   */
  async function backToDepth(depth: number, options?: TBackOptions): Promise<boolean> {
    DEPTH.parse(depth, `${WHERE} backToDepth`);
    BACK_OPTIONS.parse(options, `${WHERE} backToDepth`);
    return backTo(
      () => depth, !!options?.force, !!options?.quiet,
    );
  }

  /**
   * A link to a section's root (D-043). Another section — that section as it was left (the link's address isn't
   * applied: we land where its history is); the first visit — its root at the link's address. The section shown — back
   * to its start; if the link's address differs from the entry there, the link's address replaces it.
   */
  async function toSection(
    key: string, location: TUrlProps, quiet: boolean,
  ): Promise<void> {
    const switched = await enqueue(() => quietly(quiet, async () => {
      if (key === shown) {
        return false;
      }
      dropWindows();
      storeShown();
      if (entries.length > 1) {
        await travelToStart();
      }
      if (!stacks.has(key)) {
        stacks.set(key, [
          page(
            location, 0, key,
          ),
        ]);
      }
      rebuild(key);
      return true;
    }));
    if (switched || !(await backTo(
      sectionStart, false, quiet,
    ))) {
      return;
    }
    await enqueue(() => quietly(quiet, async () => {
      if (topPage(entries).location.href !== location.href) {
        await replaceTop(location);
      }
    }));
  }

  /**
   * The first page has nothing below it: it is replaced with `fallback` (the call's, else the navigator's — D-044),
   * windows over it closing first; `false` without one, or when the page is already there. Inside the queue.
   */
  async function toFallback(fallback: Partial<TUrlProps> | undefined): Promise<boolean> {
    if (!fallback || pageIndexAt(entries, entries.length - 1) > 0) {
      return false; // no fallback — or a page was opened while the step waited: not the first page any more
    }
    const admitted = admit(locate(fallback, topPage(entries).location), false);
    if (admitted === null || admitted.gated) {
      return false; // refused — or a gate keeps the player on its pages
    }
    const location = admitted.location;
    if (entries.length === 1 && topPage(entries).location.href === location.href) {
      return false; // already there, nothing over it
    }
    await replaceTop(location);
    return true;
  }

  /**
   * Leaves the shown page — e.g. one the player may not open: back to the previous page if the stack has one (windows
   * over the page close too), otherwise the page is replaced with the navigator's `fallback` (D-044); without one it
   * stays. A leave guard that refuses keeps it. Takes no arguments — a handler as it is (`onClick={nav.leavePage}`).
   *
   * @example
   * if (!progress.isUnlocked(levelId)) {
   *   await nav.leavePage(); // createNavigator({ …, fallback: { path: '/' } })
   * }
   */
  async function leavePage(): Promise<void> {
    // The page's place is read when the step's turn comes (a window closing before it may have changed the stack).
    if (pageIndexAt(entries, entries.length - 1) > 0) {
      await backTo((current) => pageIndexAt(entries, current) - 1, false);
    } else {
      await enqueue(() => toFallback(deps.fallback));
    }
  }

  // ── arriving: the gates, the entry guards, a first visit's layout (D-050) ───────────────────────────────────────

  /** A location's row (`null` — none, or no table yet). */
  function rowOf(location: TUrlProps): (TRouteRowBase & Record<string, unknown>) | null {
    const found = match(location.path);
    return found ? found.row : null;
  }

  /** The gate a location's page belongs to — its row's `gate`; `null` — none. */
  function gateOf(location: TUrlProps): string | null {
    const gate = rowOf(location)?.gate;
    return typeof gate === 'string' ? gate : null;
  }

  /** The first closed gate, in order — the one to pass now; `null` — all are open (or the table hasn't come). */
  function activeGate(): TGateItem | null {
    if (routed) {
      for (const gate of gates) {
        if (gate[1].getState()) {
          return gate;
        }
      }
    }
    return null;
  }

  /** The entry guards' answer for `location`: the first one that isn't `true`; all agree — `true`. */
  function askEnterGuards(location: TUrlProps): boolean | Partial<TUrlProps> {
    const found = match(location.path);
    const target = {
      location,
      row: found ? found.row : null,
      params: found ? found.params : {},
    };
    for (const item of enterGuards.slice()) {
      const answer = item.guard(target);
      if (answer !== true) {
        return ENTER_ANSWER.parse(answer, `${WHERE} onBeforeEnter: a guard's answer`);
      }
    }
    return true;
  }

  /**
   * What a step to `location` shows. The active gate admits only its own pages: another location is held (the newest
   * wins; a gate's page never is) and the player stays on the gate's page — or, not on it yet, is shown its first page
   * (`gated`). Then the entry guards, in order: a location one answers is asked again. `null` — nothing is shown.
   * `hold` — `false` for a location the player didn't ask for (the fallback).
   */
  function admit(location: TUrlProps, hold = true): { location: TUrlProps;
    gated: boolean } | null {
    let target = location;
    for (let redirects = 0; ; redirects++) {
      const gate = activeGate();
      const own = gateOf(target);
      if (gate !== null && own !== gate[0]) {
        if (hold && own === null) {
          held = target;
        }
        return gateOf(topPage(entries).location) === gate[0] ? null : {
          location: locate(gate[2], target),
          gated: true,
        };
      }
      const answer = askEnterGuards(target);
      if (answer === true) {
        return {
          location: target,
          gated: false,
        };
      }
      if (answer === false) {
        return null;
      }
      if (redirects === MAX_REDIRECTS) {
        throw new Error(`${WHERE} onBeforeEnter: more than ${MAX_REDIRECTS} redirects in a row — a loop? (the last to "${target.href}")`);
      }
      target = locate(answer, target);
    }
  }

  /** A step wasn't taken: if it was held meanwhile, the held location goes into the state and the history. */
  async function keepHeld(before: TUrlProps | null): Promise<void> {
    if (held !== before) {
      await enqueue(saveHeld);
    }
  }

  /** The held location into the state and into the history's entry on top (it survives a reload). Inside the queue. */
  function saveHeld(): void {
    write(entries[entries.length - 1], true);
    publish();
  }

  /**
   * How a first visit lays `location` out: without sections over the `fallback` (unless it is the fallback); with
   * sections `reset` puts the start root under it.
   */
  function firstVisit(location: TUrlProps): TUrlProps[] {
    if (homeSection === null && deps.fallback) {
      const base = locate(deps.fallback, location);
      if (base.href !== location.href) {
        return [
          base,
          location,
        ];
      }
    }
    return [location];
  }

  /**
   * Drops the stack and lays it out anew from the history's current entry: `locations`, bottom to top — every page but
   * the last dormant, the last shown (unless `quiet`); published once. Inside the queue, or at the start.
   */
  function layOut(locations: readonly TUrlProps[], quiet: boolean): void {
    const last = locations.length - 1;
    quietStep = last > 0 || quiet;
    reset(locations[0]);
    for (let i = 1; i <= last; i++) {
      quietStep = i < last || quiet;
      const same = samePage(locations[i]);
      push(page(
        locations[i], entries.length, same ? same.section : shown, same?.id,
      ));
    }
    if (last === 0) {
      publish();
    }
    quietStep = false;
  }

  /** Back to the stack's first entry, then `layOut`. Inside the queue. */
  async function startOverIn(locations: readonly TUrlProps[], quiet: boolean): Promise<void> {
    if (entries.length > 1) {
      await travelToStart();
    }
    layOut(locations, quiet);
  }

  /**
   * The active gate shows its page: the page on screen is held — unless it is a gate's, or something is held already
   * (it passes from gate to gate) — and the stack starts over at the gate's first page. Inside the queue.
   */
  async function holdForGate(gate: TGateItem): Promise<void> {
    const location = topPage(entries).location;
    if (gateOf(location) === null && held === null) {
      held = location;
    }
    await startOverIn([locate(gate[2], location)], false);
  }

  /**
   * A stack restored from the history (a move into one the navigator doesn't hold — after a reload, after a start over)
   * is shown — unless the active gate must hold it (D-050). Inside the queue.
   */
  async function showRestored(): Promise<void> {
    const gate = activeGate();
    if (gate !== null && gateOf(topPage(entries).location) !== gate[0]) {
      await holdForGate(gate);
      return;
    }
    publish();
    await passGoneWindows();
  }

  /**
   * Every gate is open: the held location is laid out as a first visit would lay it out, nothing shown on the way (the
   * entry guards asked; refused — the `fallback`); nothing held, a gate's page on screen — the `fallback`. Checked when
   * its turn comes: a gate closed meanwhile, or released already — nothing. Inside the queue.
   */
  async function release(): Promise<void> {
    const location = topPage(entries).location;
    if (activeGate() !== null || held === null && gateOf(location) === null) {
      return;
    }
    const fallback = deps.fallback ? locate(deps.fallback, location) : null;
    const target = held;
    held = null;
    const admitted = (target && admit(target, false)) || (fallback && admit(fallback, false));
    if (!admitted) {
      saveHeld(); // nothing to show: the gate's page stays, nothing is held any more
      return;
    }
    await startOverIn(firstVisit(admitted.location), false);
  }

  /** A gate's store changed: the active gate holds; none closed — the held location is shown. Inside the queue. */
  async function gatesChanged(): Promise<void> {
    if (!routed) {
      return; // the start check decides when the table comes
    }
    const gate = activeGate();
    if (gate === null) {
      await release();
    } else if (gateOf(topPage(entries).location) !== gate[0]) {
      await holdForGate(gate);
    }
  }

  /**
   * The route table has come for the first time — the host is made, nothing is drawn yet: the page in the address is
   * asked (the gates, the entry guards; refused — the `fallback`), and a first visit is laid out (`firstVisit`). A
   * location held before a reload with every gate open now: shown if a gate's page is on screen, otherwise dropped.
   */
  function startCheck(): void {
    const location = topPage(entries).location;
    const single = entries.length === 1;
    const admitted = admit(location) || (deps.fallback ? admit(locate(deps.fallback, location), false) : null);
    let target: TUrlProps[] | null = null;
    if (admitted && admitted.gated) {
      target = [admitted.location]; // the gate's page alone: Back from it leaves the app
    } else if (admitted && admitted.location.href !== location.href) {
      target = firstVisit(admitted.location); // a guard sent it elsewhere, or the fallback took it
    } else if (!restored && single && entries[0].id === firstId && firstVisit(location).length > 1) {
      target = firstVisit(location); // a deep link: the fallback under it (sections — the start root, below)
    }
    if (held !== null && activeGate() === null) {
      if (gateOf(location) === null) {
        held = null;
      } else {
        void enqueue(release);
      }
    }
    if (target === null) {
      if (homeSection !== null && shown === null) {
        reset(location);
      }
      publish();
    } else if (single) {
      layOut(target, false);
    } else {
      publish();
      const locations = target;
      void enqueue(() => startOverIn(locations, false));
    }
  }

  /**
   * `guard` is asked before a location is shown — by any step, a link, a tab, `startOver`, `leavePage`'s fallback, an
   * address from outside, and for the page in the address at the start (D-050): `true` — open it; a location — open that
   * instead (asked again); `false` — it isn't opened, the player stays (at the start — the `fallback`). Not asked: Back
   * and Forward over pages already in the stack, windows. Synchronous — the start is decided before the first render.
   * Returns the unsubscribe.
   *
   * @example
   * nav.onBeforeEnter(({ params }) => params.levelId === undefined || progress.isUnlocked(params.levelId)); // locked: stays
   * nav.onBeforeEnter(({ location }) => (location.path === '/old-shop' ? { path: '/shop' } : true));      // moved
   */
  function onBeforeEnter(guard: TEnterGuard): () => void {
    func().parse(guard, `${WHERE} onBeforeEnter`);
    const item = {
      guard,
    };
    enterGuards.push(item);
    return () => {
      const at = enterGuards.indexOf(item);
      if (at >= 0) {
        enterGuards.splice(at, 1);
      }
    };
  }

  // ── whether an entry's leave is being confirmed (D-047) ───────────────────────────────────────────────────────

  /** Whether the entry's leave guards are being asked now ("discard changes?"); it may stay. */
  const isConfirmingLeave = (entryId: number): boolean => entries.some((entry) => entry.id === entryId && entry.confirmingLeave);

  /**
   * Watches the entry's `confirmingLeave` — a fact of the state, so (as a store's `watch`, D-049) `listener` is called
   * at once with its value, then whenever it flips (`true` — its guards are asked; `false` — they answered: it stays,
   * or it is gone). Returns the unsubscribe.
   *
   * @example
   * const stop = nav.watchConfirmingLeave(entryId, (confirming) => autosave.pause(confirming));
   */
  function watchConfirmingLeave(entryId: number, listener: (confirming: boolean) => void): Unsubscribe {
    let last: boolean | undefined;
    return $state.watch((value) => {
      const now = value.entries.some((entry) => entry.id === entryId && entry.confirmingLeave);
      if (now !== last) {
        last = now;
        listener(now);
      }
    });
  }

  // ── reading the stack (shortcuts, D-045) ──────────────────────────────────────────────────────────────────────

  /** The stack, bottom to top: pages and windows (the reference's `getHistory`). */
  const getHistory = (): readonly TEntry[] => entries;

  /** The location of the entry below the top one — what Back shows (`undefined` at the first entry). */
  const getPrevLocation = (): TUrlProps | undefined => (entries.length > 1 ? pageAt(entries, entries.length - 2).location : undefined);

  /** The location the browser's Forward brings back (`undefined` — nothing ahead); a window ahead keeps the page's. */
  function getNextLocation(): TUrlProps | undefined {
    const next = ahead[0];
    if (!next) {
      return undefined;
    }
    return next.kind === PAGE ? next.location : topPage(entries).location;
  }

  // ── registrations ─────────────────────────────────────────────────────────────────────────────────────────────

  /** Runs `effect` now; its cleanup runs when the entry starts being left, and it runs again if leaving is refused. */
  function whileOpen(entryId: number, effect: () => void | (() => void)): () => void {
    const item: TOpenedEffect = {
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

  /**
   * `guard` is asked before the entry is left by going back; `false` keeps it. While it is registered the entry is
   * `leaveGuarded` (D-049) — register it while there is something to lose, so the fact means "unsaved".
   */
  function onBeforeLeave(entryId: number, guard: TLeaveGuard): () => void {
    const remove = guards.add(entryId, guard);
    refreshLeaveGuarded(entryId);
    return () => {
      remove();
      refreshLeaveGuarded(entryId);
    };
  }

  // ── whether an entry has a leave guard (D-049) ─────────────────────────────────────────────────────────────────

  /** Whether the entry has a leave guard now — leaving it would ask. */
  const isLeaveGuarded = (entryId: number): boolean => guards.has(entryId);

  /**
   * Watches whether the entry has a leave guard — a fact of the state: `listener` is called at once with it, then
   * whenever it flips (D-049). Returns the unsubscribe.
   *
   * @example
   * nav.watchLeaveGuarded(entryId, (guarded) => saveIndicator.toggle(guarded));
   */
  function watchLeaveGuarded(entryId: number, listener: (guarded: boolean) => void): Unsubscribe {
    let last: boolean | undefined;
    return $state.watch(() => {
      const now = guards.has(entryId);
      if (now !== last) {
        last = now;
        listener(now);
      }
    });
  }

  /** Whether some entry — in any section — has a leave guard: leaving the app would lose something. */
  const isAnyLeaveGuarded = (): boolean => anyLeaveGuarded();

  /**
   * Watches whether some entry — in any section — has a leave guard: `listener` at once, then on every flip.
   *
   * @example
   * attachEvent(window, 'beforeunload', (event) => nav.isAnyLeaveGuarded() && event.preventDefault());
   * nav.watchAnyLeaveGuarded((guarded) => showUnsavedMark(guarded));
   */
  function watchAnyLeaveGuarded(listener: (guarded: boolean) => void): Unsubscribe {
    let last: boolean | undefined;
    return $state.watch((value) => {
      if (value.anyLeaveGuarded !== last) {
        last = value.anyLeaveGuarded;
        listener(last);
      }
    });
  }

  /**
   * The table, from the host: rows, sections; every entry gets its row; sections lay the stack out on first sight. A new host
   * gives a new table (a hot reload of the module that makes it); the table is the navigator's, so two hosts mounted at
   * once draw the same pages.
   */
  function setRoutes(routes: readonly TRouteRow[]): void {
    const matcher = routeTableMatcher(routes);
    for (const [
      name,,
      to,
    ] of gates) {
      const first = locate(to, topPage(entries).location);
      if (matcher(first.path)?.row.gate !== name) {
        throw new TypeError(`${WHERE}: the gate "${name}": its page "${first.path}" isn't one of its pages — mark its row \`gate: '${name}'\``);
      }
    }
    match = matcher;
    rootKeys = new Map();
    roots = [];
    for (const [
      pattern,
      row,
    ] of routes) {
      if (row.section && !rootKeys.has(row)) {
        const path = fixedPathOf(pattern);
        rootKeys.set(row, pattern);
        roots.push([
          pattern,
          path,
          pathPrefix(path),
        ]);
      }
    }
    homeSection = roots.length ? roots[0][0] : null;
    homeRoot = homeSection === null ? null : urlParse(homeSection);
    const describe = (entry: TEntry): TEntry => (entry.kind === PAGE ? {
      ...page(
        entry.location, entry.depth, entry.section, entry.id,
      ),
      dormant: entry.dormant,
      confirmingLeave: entry.confirmingLeave,
      leaveGuarded: entry.leaveGuarded,
      historyIndex: entry.historyIndex,
    } : entry);
    entries = entries.map(describe);
    ahead = ahead.map(describe);
    for (const [
      name,
      list,
    ] of stacks) {
      stacks.set(name, list.map(describe));
    }
    if (!routed) {
      routed = true;
      startCheck();
      return;
    }
    if (homeSection !== null && shown === null) {
      reset(topPage(entries).location);
    }
    publish();
  }

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────

  const showLocation = router.attach({
    push: async (location, options) => {
      await go(location, options);
    },
    replace,
    // At the first page Back goes to the navigator's fallback, if it has one (D-044).
    back: (count: number, options?: TBackOptions) => (entries.length < 2 ? enqueue(() => quietly(!!options?.quiet, () => toFallback(deps.fallback))) : backTo(
      (current) => current - count, !!options?.force, !!options?.quiet,
    )),
  });

  // A reload restores the stack the history kept; a first visit starts it from the address.
  const start = primitive.current();
  let restored = false;
  if (isNavData(start.data)) {
    restore(start.data);
    restored = true;
  } else {
    reset(start.location);
    firstId = entries[0].id;
  }
  storeShown();
  let state = snapshot();
  const $state = createObservable<TNavigatorState>(state);
  const {
    emitState,
  } = createApi($state, {
    emitState: (_, payload: TNavigatorState) => payload,
  });
  showLocation(state.location);
  if (restored) {
    void enqueue(passGoneWindows);
  }
  primitive.watch((entry, from) => {
    void enqueue(() => settle(entry, from.index));
  });
  // A gate's store fires at once too (a store's watch) — before the table that one is the start check's (D-050)
  for (const gate of gates) {
    gate[1].watch(() => {
      void enqueue(gatesChanged);
    });
  }

  const view = createNavigatorView(deps, {
    $state,
    entries: () => entries,
    close,
    whileOpen,
    onForward,
    onBeforeLeave,
    setRoutes,
    rootOf,
    gateNames: gates.map((gate) => gate[0]),
  });

  return {
    $state,
    /** The depth of the top entry, observable (the reference's `$historyDepth`). */
    $depth: $state.map((value) => value.depth),
    getState: () => state,
    getHistory,
    getPrevLocation,
    getNextLocation,
    isConfirmingLeave,
    watchConfirmingLeave,
    isLeaveGuarded,
    watchLeaveGuarded,
    isAnyLeaveGuarded,
    watchAnyLeaveGuarded,
    open,
    close,
    startOver,
    leavePage,
    backToRoot,
    backToDepth,
    whileOpen,
    onForward,
    onBeforeLeave,
    onBeforeEnter,
    ...view,
  };
}

/** A navigator. */
export type TNavigator = ReturnType<typeof createNavigator>;
