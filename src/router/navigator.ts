// The navigator (fundamentool D-038, D-039): pages and windows over a router — a stack in step with the router's part
// of the history: every page and every window is an entry, so Back closes the top one; Forward brings back what Back
// left (D-024); covered pages can stay mounted; tabs keep their own histories; the stack survives a reload.
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  createTimeout,
} from '../createTimeout';
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
  isNumber,
} from '../is/isNumber';
import {
  isObject,
} from '../is/isObject';
import {
  keyedRegistry,
} from '../keyedRegistry';
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
  assertFlags,
  BACK_OPTION_KEYS,
} from './options';
import {
  fixedPathOf,
  routeTableMatcher,
} from './routeTable';
import type {
  TRouteMatch,
} from './routeTable';
import type {
  TBackOptions,
  TEntry,
  THistoryEntry,
  TForwardHandler,
  TLeaveGuard,
  TLeavePageOptions,
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

/** The dependencies that are functions: the observable adapter and the view library. */
const FUNCTION_DEPS = [
  'createObservable',
  'createApi',
  'createElement',
  'forwardRef',
  'useEffect',
  'useState',
  'useRef',
  'createContext',
  'useContext',
] as const;

/** The settings that are numbers ≥ 0. */
const NUMBER_DEPS = [
  'keep',
  'exitMs',
] as const;

/** The single list of `createNavigator`'s keys. */
export const NAVIGATOR_DEPS_KEYS = [
  'router',
  ...FUNCTION_DEPS,
  ...NUMBER_DEPS,
] as const;

/** The single list of `open`'s option keys. */
export const OPEN_OPTION_KEYS = ['reopen'] as const;

/** The single list of `leavePage`'s option keys. */
export const LEAVE_PAGE_OPTION_KEYS = ['fallback'] as const;

/** An entry as the history keeps it (to rebuild the stack after a reload): a page's address and tab, a window's place. */
type TSaved = [kind: typeof PAGE, id: number, href: string, section: string | null] | [kind: typeof WINDOW, id: number];

/** The shape of what the navigator writes into an entry; a new shape — a new number (older entries start the stack anew). */
const NAV_FORMAT = 1;

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

function assertNavigatorDeps(deps: TNavigatorDeps): void {
  if (!isObject(deps)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(deps)}`);
  }
  assertKnownOptions(
    WHERE, deps, NAVIGATOR_DEPS_KEYS,
  );
  if (!isObject(deps.router) || !isFunction(deps.router.attach)) {
    throw new TypeError(`${WHERE}: "router" expects a router (createRouter(…)), got ${describeValue(deps.router)}`);
  }
  for (const key of FUNCTION_DEPS) {
    if (!isFunction(deps[key])) {
      throw new TypeError(`${WHERE}: "${key}" expects a function, got ${describeValue(deps[key])}`);
    }
  }
  for (const key of NUMBER_DEPS) {
    const value = deps[key];
    if (value !== undefined && !(isNumber(value) && value >= 0)) {
      throw new TypeError(`${WHERE}: "${key}" expects a number ≥ 0, got ${describeValue(value)}`);
    }
  }
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
  assertNavigatorDeps(deps);
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
      closing: false,
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
    });
  }

  /** The stack as the state, emitted; the router shows the top page's location. A quiet step publishes nothing. */
  function publish(): void {
    storeShown();
    if (quietStep) {
      return;
    }
    state = snapshot();
    emitState(state);
    showLocation(state.location);
  }

  /** Marks the entries `ids` names as having their leave guards asked (or not); the state isn't emitted. */
  function markClosing(ids: ReadonlySet<number>, closing: boolean): void {
    entries = entries.map((entry) => (ids.has(entry.id) && entry.closing !== closing ? {
      ...entry,
      closing,
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
    write(list[0], true);
    for (let i = 1; i < length; i++) {
      entries = list.slice(0, i + 1);
      write(list[i], false);
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
    ] : [
      WINDOW,
      entry.id,
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

  /** Writes `entry` (the top of `entries`) into the router's part: a new entry or the current one. */
  function write(entry: TEntry, replace: boolean): void {
    const depth = entry.depth;
    const data: TNavData = {
      nav: NAV_FORMAT,
      id: entry.id,
      depth,
      stack: entries.slice(0, depth + 1).map(saved),
      shown,
      tabs: savedTabs(),
    };
    (replace ? primitive.replace : primitive.push)(pageAt(entries, depth).location, data);
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
          closing: false,
        };
      }
      return {
        ...page(
          urlParse(item[2]), depth, item[3], item[1],
        ),
        dormant: true,
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
    ahead = [];
    for (const entry of dropped) {
      forget(entry);
      entry.kind === WINDOW && resolve(entry, null);
    }
  }

  /** A move made by the code; resolves with the part in the entry arrived at. */
  const travel = (delta: number): Promise<THistoryEntry> => primitive.go(delta);

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
    // What is left isn't being left any more (Forward may bring it back).
    const removed = entries.slice(depth + 1).map((entry) => (entry.closing ? {
      ...entry,
      closing: false,
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
      await travel(-1);
      removeAbove(entries.length - 2);
      top = entries[entries.length - 1];
    }
  }

  /**
   * The history is now at `entry` — make the stack match. Going back past entries with leave guards: step forward
   * again, ask the guards (they may open windows, so outside the queue), and leave as far as they agree. `force` —
   * the guards aren't asked.
   */
  async function settle(entry: THistoryEntry, force = false): Promise<TOutcome> {
    const data = entry.data;
    if (!isNavData(data)) {
      reset(entry.location);
      publish();
      return LEFT;
    }
    const current = entries.length - 1;
    const target = data.depth;
    if (target > current) {
      return forwardTo(target, data);
    }
    if (entries[target]?.id !== data.id) {
      // An entry of a stack we don't hold (written before a reload): the stack is what it kept.
      restore(data);
      publish();
      await passGoneWindows();
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
        await travel(current);
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
    await travel(current - target);
    // Asked outside the queue (a guard may open a window); the caller may wait for the answer through `left`.
    return {
      left: confirmLeave(target, removed),
    };
  }

  /**
   * Asks the guards of `removed`, top entry first; meanwhile they are `closing` in the state. All agree — go to
   * `target`. One refuses — stop at its entry: what was above it is left, it and what is below stay (their `whileOpen`
   * effects run again).
   */
  async function confirmLeave(target: number, removed: readonly TEntry[]): Promise<boolean> {
    markClosing(new Set(removed.map((entry) => entry.id)), true);
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
      markClosing(new Set(staying.map((entry) => entry.id)), false);
      publish();
    }
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
   * The history went Forward to `target` (D-024): the entries ahead come back — pages with their address, windows
   * reopened (nobody awaits them). An entry we don't keep ahead (after a reload) — the stack the history kept, its
   * windows passed. Forward handlers of the current top are asked first (outside the queue: they may open windows).
   */
  async function forwardTo(target: number, data: TNavData): Promise<TOutcome> {
    const current = entries.length - 1;
    const count = target - current;
    const back = ahead.slice(0, count);
    if (back.length < count || back[count - 1].id !== data.id) {
      const ours = data.stack.slice(0, current + 1).every((item, depth) => item[1] === entries[depth].id);
      if (ours && data.stack.slice(current + 1).some((item) => item[0] === WINDOW)) {
        // Our own stack with windows ahead we don't keep (they come back only from `ahead`): the move is undone.
        await travel(current - target);
        return STAYED;
      }
      // Pages we don't hold (after a reload): the stack the history kept.
      restore(data);
      publish();
      await passGoneWindows();
      return LEFT;
    }
    const kind = back[0].kind;
    // A step of the shown page coming back isn't something opening over it.
    if (back[0].id === entries[current].id || !hasForward(kind)) {
      restoreAhead(back);
      return LEFT;
    }
    await travel(current - target);
    void askForward(kind).then((go) => (go ? enqueue(async () => {
      if (entries.length - 1 === current && ahead[count - 1] === back[count - 1]) {
        await travel(count);
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
      write(list[0], true);
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
  async function go(location: TUrlProps, options?: TStepOptions): Promise<boolean> {
    const quiet = !!options?.quiet;
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
      await settle(await travel(index - current));
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

  function replace(location: TUrlProps, options?: TStepOptions): Promise<void> {
    return enqueue(() => quietly(!!options?.quiet, () => replaceTop(location)));
  }

  /** Drops every page and window and opens `change` alone — sign out, switching account. */
  function startOver(change: Partial<TUrlProps>): Promise<void> {
    return enqueue(async () => {
      const location = locate(change, topPage(entries).location);
      const current = entries.length - 1;
      if (current > 0) {
        await travel(-current);
      }
      reset(location);
      publish();
    });
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
    if (options !== undefined) {
      if (!isObject(options) || isArray(options)) {
        throw new TypeError(`${WHERE} open: expects an options object, got ${describeValue(options)}`);
      }
      assertKnownOptions(
        `${WHERE} open`, options, OPEN_OPTION_KEYS,
      );
    }
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
          closing: false,
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
      await settle(await travel(entry.depth - 1 - (entries.length - 1)));
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
        return settle(await travel(depth - current), force);
      }
      return wanted === current ? LEFT : STAYED; // there already — or nothing to go back to
    }));
    return outcome.left;
  }

  /** The place of the shown section's first entry (its root, unless it was opened by a deep link); `0` without sections. */
  const sectionStart = (): number => (shown === null || shown === homeSection ? 0 : 1);

  /**
   * Back in one move to the start of the shown section — its first entry; without sections, the first page. `force` —
   * the leave guards aren't asked (sign out, D-026); `quiet` — nothing is shown until the next step (D-042). Resolves
   * `true` when it is there.
   *
   * @example
   * await nav.backToRoot({ force: true, quiet: true }); // sign out: back to the start, nothing shown on the way
   * await nav.open(SignIn);
   */
  async function backToRoot(options?: TBackOptions): Promise<boolean> {
    assertFlags(
      `${WHERE} backToRoot`, options, BACK_OPTION_KEYS,
    );
    return backTo(
      sectionStart, !!options?.force, !!options?.quiet,
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
        await travel(-(entries.length - 1));
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
   * Leaves the shown page — e.g. one the player may not open: back to the previous page if the stack has one (windows
   * over the page close too), otherwise the page is replaced with `fallback`. A leave guard that refuses keeps it.
   *
   * @example
   * if (!progress.isUnlocked(levelId)) {
   *   await nav.leavePage({ fallback: { path: '/' } });
   * }
   */
  async function leavePage(options: TLeavePageOptions): Promise<void> {
    if (!isObject(options) || isArray(options)) {
      throw new TypeError(`${WHERE} leavePage: expects an options object, got ${describeValue(options)}`);
    }
    assertKnownOptions(
      `${WHERE} leavePage`, options, LEAVE_PAGE_OPTION_KEYS,
    );
    const fallback = options.fallback;
    if (!isObject(fallback)) {
      throw new TypeError(`${WHERE} leavePage: "fallback" expects a location ({ path, query, … }), got ${describeValue(fallback)}`);
    }
    // The page's place is read when the step's turn comes (a window closing before it may have changed the stack).
    if (pageIndexAt(entries, entries.length - 1) > 0) {
      await backTo((current) => pageIndexAt(entries, current) - 1, false);
    } else {
      await router.replaceLocation(fallback);
    }
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

  /** `guard` is asked before the entry is left by going back; `false` keeps it. */
  function onBeforeLeave(entryId: number, guard: TLeaveGuard): () => void {
    return guards.add(entryId, guard);
  }

  /**
   * The table, from the host: rows, sections; every entry gets its row; sections lay the stack out on first sight. A new host
   * gives a new table (a hot reload of the module that makes it); the table is the navigator's, so two hosts mounted at
   * once draw the same pages.
   */
  function setRoutes(routes: readonly TRouteRow[]): void {
    match = routeTableMatcher(routes);
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
      closing: entry.closing,
    } : entry);
    entries = entries.map(describe);
    ahead = ahead.map(describe);
    for (const [
      name,
      list,
    ] of stacks) {
      stacks.set(name, list.map(describe));
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
    back: (options?: TBackOptions) => (entries.length < 2 ? Promise.resolve(false) : backTo(
      (current) => current - 1, !!options?.force, !!options?.quiet,
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
  primitive.watch((entry) => {
    void enqueue(() => settle(entry));
  });

  const view = createNavigatorView(deps, {
    $state,
    entries: () => entries,
    close,
    whileOpen,
    onForward,
    onBeforeLeave,
    setRoutes,
    rootOf,
  });

  return {
    $state,
    getState: () => state,
    open,
    close,
    startOver,
    leavePage,
    backToRoot,
    whileOpen,
    onForward,
    onBeforeLeave,
    ...view,
  };
}

/** A navigator. */
export type TNavigator = ReturnType<typeof createNavigator>;
