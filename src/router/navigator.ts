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
  locate,
} from './location';
import {
  computeState,
  topPage,
} from './navigatorState';
import {
  createNavigatorView,
} from './navigatorView';
import {
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
  TWindowEntry,
} from './types';

const WHERE = '[fundamentool] createNavigator';

/** The single list of `createNavigator`'s keys. */
export const NAVIGATOR_DEPS_KEYS = [
  'router',
  'createObservable',
  'createApi',
  'createElement',
  'forwardRef',
  'Component',
  'useEffect',
  'useState',
  'useRef',
  'createContext',
  'useContext',
  'keep',
  'exitMs',
] as const;

/** The single list of `open`'s option keys. */
export const OPEN_OPTION_KEYS = ['reopen'] as const;

/** The single list of `leavePage`'s option keys. */
export const LEAVE_PAGE_OPTION_KEYS = ['fallback'] as const;

/** An entry as the history keeps it (to rebuild the stack after a reload): a page's address and tab, a window's place. */
type TSaved = [kind: 'page', id: number, href: string, section: string | null] | [kind: 'window', id: number];

/** What the navigator writes into its part of an entry: the entry and the whole stack it closes. */
type TNavData = {
  nav: 1;
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
  return isObject(value) && (value as TNavData).nav === 1 && isNumber((value as TNavData).depth);
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
  for (const key of NAVIGATOR_DEPS_KEYS) {
    if (key !== 'router' && key !== 'keep' && key !== 'exitMs' && !isFunction(deps[key]) && !(key === 'Component' && isObject(deps[key]))) {
      throw new TypeError(`${WHERE}: "${key}" expects a function, got ${describeValue(deps[key])}`);
    }
  }
  for (const key of [
    'keep',
    'exitMs',
  ] as const) {
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
  const keepLimit = deps.keep ?? 10;
  const exitMs = deps.exitMs ?? 300;

  // ── the table (given by the host) ──────────────────────────────────────────────────────────────────────────────

  let match: (path: string) => TRouteMatch<Record<string, unknown>> | null = () => null;
  /** Tabs → their root's location; the first is the start tab. */
  let sections: Record<string, TUrlProps> = {};
  let homeSection: string | null = null;

  // ── the stack ─────────────────────────────────────────────────────────────────────────────────────────────────

  let nextId = 1;
  let entries: TEntry[] = [];
  let leaving: TWindowEntry[] = [];
  /** Entries left by going back, nearest first — what the browser's Forward restores (D-024). */
  let ahead: TEntry[] = [];
  /** Each tab's own stack, and the tab shown (`null` without tabs). */
  const stacks = new Map<string, TEntry[]>();
  let shown: string | null = null;

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

  /** A page entry: its row and parameters from the table, its tab — its root's, or the one it's opened in. */
  function page(
    location: TUrlProps, depth: number, section: string | null = shown, id = nextId++,
  ): TPageEntry {
    const found = match(location.path);
    return {
      kind: 'page',
      id,
      depth,
      location,
      row: found ? found.row : null,
      params: found ? found.params : {},
      section: found?.row.section ?? section,
      dormant: false,
    };
  }

  // ── state ─────────────────────────────────────────────────────────────────────────────────────────────────────

  let state = null as unknown as TNavigatorState;
  const $state = createObservable<TNavigatorState>(state);
  const {
    emitState,
  } = createApi($state, {
    emitState: (_, payload: TNavigatorState) => payload,
  });

  /** The stack as the state; the router shows the top page's location. */
  function publish(): void {
    if (shown !== null) {
      stacks.set(shown, shown === homeSection ? entries : entries.slice(1));
    }
    // The page on top is shown: restored after a reload, it wakes up now.
    const topIndex = entries.lastIndexOf(topPage(entries));
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
    state = computeState({
      entries,
      leaving,
      ahead,
      stacks,
      shown,
      keepLimit,
    });
    emitState(state);
    showLocation(state.location);
  }

  // ── tabs ──────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * The tab a location belongs to: the tab with the longest root that is its path or starts it (a root `/` takes what
   * no other tab does); otherwise the start tab.
   */
  function sectionOf(location: TUrlProps): string {
    const path = location.path;
    let found = homeSection as string;
    let longest = -1;
    for (const name of Object.keys(sections)) {
      const root = sections[name].path;
      const fits = path === root || path.startsWith(root.endsWith('/') ? root : root + '/');
      if (fits && root.length > longest) {
        found = name;
        longest = root.length;
      }
    }
    return found;
  }

  /** What the history holds for a tab — the start tab's root under it, then its stack. */
  function layout(section: string): TEntry[] {
    const home = homeSection as string;
    if (!stacks.has(home)) {
      stacks.set(home, [
        page(
          sections[home], 0, home,
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
    const first = entries.findIndex((entry) => entry.kind === 'window');
    if (first < 0) {
      return;
    }
    const windows = entries.slice(first) as TWindowEntry[];
    ahead = [];
    runOpened(windows, 'close');
    entries = entries.slice(0, first);
    for (const entry of windows) {
      forget(entry);
      resolve(entry, null);
    }
  }

  // ── the history ───────────────────────────────────────────────────────────────────────────────────────────────

  function saved(entry: TEntry): TSaved {
    return entry.kind === 'page' ? [
      'page',
      entry.id,
      entry.location.href,
      entry.section,
    ] : [
      'window',
      entry.id,
    ];
  }

  /** Writes `entry` (the top of `entries`) into the router's part: a new entry or the current one. */
  function write(entry: TEntry, replace: boolean): void {
    const tabs: Record<string, TSaved[]> = {};
    for (const [
      name,
      list,
    ] of stacks) {
      if (name !== shown) {
        tabs[name] = list.map(saved);
      }
    }
    const data: TNavData = {
      nav: 1,
      id: entry.id,
      depth: entry.depth,
      stack: entries.slice(0, entry.depth + 1).map(saved),
      shown,
      tabs,
    };
    const location = topPage(entries.slice(0, entry.depth + 1)).location;
    (replace ? primitive.replace : primitive.push)(location, data);
  }

  /** Entries rebuilt from what the history kept: pages dormant (not mounted until reached), windows gone. */
  function fromSaved(list: readonly TSaved[]): TEntry[] {
    return list.map((item, depth) => {
      nextId = Math.max(nextId, item[1] + 1);
      if (item[0] === 'window') {
        return {
          kind: 'window',
          id: item[1],
          depth,
          window: null,
          params: undefined,
          reopen: false,
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

  /** The stack from an entry the history kept (a reload, or a move to an entry we don't hold). */
  function restore(data: TNavData): void {
    const dropped = [
      ...entries,
      ...[...stacks.values()].flat(),
    ];
    runOpened(entries, 'close');
    stacks.clear();
    shown = data.shown;
    for (const name of Object.keys(data.tabs)) {
      stacks.set(name, fromSaved(data.tabs[name]));
    }
    entries = fromSaved(data.stack);
    ahead = [];
    for (const entry of dropped) {
      forget(entry);
      entry.kind === 'window' && resolve(entry, null);
    }
    publish();
  }

  /** A move made by the code; resolves with the part in the entry arrived at. */
  const travel = (delta: number): Promise<THistoryEntry> => primitive.go(delta);

  /** One step at a time, in call order (fundamentool's `queueProvider`). */
  const queue = queueProvider()((work: () => unknown) => work());
  const enqueue = <T>(work: () => Promise<T> | T): Promise<T> => queue(work) as Promise<T>;

  // ── stack changes ─────────────────────────────────────────────────────────────────────────────────────────────

  function runOpened(list: readonly TEntry[], phase: 'close' | 'reopen'): void {
    for (let i = list.length - 1; i >= 0; i--) {
      for (const item of opened.list(list[i].id)) {
        if (phase === 'close') {
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
    const stop = removed.findIndex((entry) => entry.kind === 'window' && !entry.reopen);
    ahead = stop < 0 ? [
      ...removed,
      ...ahead,
    ] : removed.slice(0, stop);
    const windows = removed.filter((entry): entry is TWindowEntry => entry.kind === 'window');
    for (const entry of removed) {
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
    while (top.kind === 'window' && top.window === null) {
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
      await passGoneWindows();
      return LEFT;
    }
    /* istanbul ignore next -- the history never reports the entry it is already on */
    if (target === current) {
      return STAYED;
    }
    if (shown !== null && target === 0 && shown !== homeSection) {
      // Back past a tab's root: that tab keeps its root, the start tab is shown.
      const removed = entries.slice(2);
      runOpened(removed, 'close');
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
    const removed = entries.slice(target + 1);
    runOpened(removed, 'close');
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
    runOpened(removed.filter((entry) => entry.depth <= stop), 'reopen');
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
      if (ours && data.stack.slice(current + 1).some((item) => item[0] === 'window')) {
        // Our own stack with windows ahead we don't keep (they come back only from `ahead`): the move is undone.
        await travel(current - target);
        return STAYED;
      }
      // Pages we don't hold (after a reload): the stack the history kept.
      restore(data);
      await passGoneWindows();
      return LEFT;
    }
    const kind = back[0].kind;
    if (!hasForward(kind)) {
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

  /** Drops the stack and starts it at `location` (with tabs: over the start tab's root). */
  function reset(location: TUrlProps): void {
    const dropped = [
      ...entries,
      ...[...stacks].filter(([name]) => name !== shown).flatMap(([, list]) => list),
    ];
    runOpened(entries, 'close');
    stacks.clear();
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
      entry.kind === 'window' && resolve(entry, null);
    }
    publish();
  }

  /** Does the top entry have forward handlers for this kind of step? */
  function hasForward(kind: 'page' | 'window'): boolean {
    return forward.list(entries[entries.length - 1].id).some((item) => kind === 'page' || item.windows);
  }

  /** Asks the forward handlers of the top entry; `false` — cancelled. Runs outside the queue (handlers may open windows). */
  async function askForward(kind: 'page' | 'window'): Promise<boolean> {
    const top = entries[entries.length - 1];
    for (const {
      handler,
    } of forward.list(top.id).filter((item) => kind === 'page' || item.windows)) {
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
   * A new page. Forward handlers are asked first — outside the queue, they may open windows; with none, the step takes
   * its place in the queue at once, so steps keep their call order.
   */
  async function go(location: TUrlProps): Promise<boolean> {
    if (hasForward('page') && !(await askForward('page'))) {
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
      runOpened([old], 'close');
      forget(old);
      const fresh = page(
        location, index, (old as TPageEntry).section,
      );
      entries = [
        ...entries.slice(0, index),
        fresh,
      ];
      write(fresh, true);
      ahead = [];
      publish();
    });
  }

  /** Drops every page and window and opens `change` alone — sign out, switching account. */
  function startOver(change: Partial<TUrlProps>): Promise<void> {
    return enqueue(async () => {
      const location = locate(change, state.location);
      const current = entries.length - 1;
      if (current > 0) {
        await travel(-current);
      }
      reset(location);
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
    if (hasForward('window') && !(await askForward('window'))) {
      return null;
    }
    return new Promise<R | null>((done) => {
      void enqueue(() => {
        const entry: TWindowEntry = {
          kind: 'window',
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
      if (result !== undefined) {
        results.set(entryId, result);
      }
      await settle(await travel(entry.depth - 1 - (entries.length - 1)));
    });
  }

  /**
   * Back in one move to the depth `target` gives for the stack as it is when the step's turn comes; the guards of the
   * entries left are asked, top first — a refusal stops there; `force` — they aren't asked. Resolves `true` when the
   * entries were left.
   */
  async function backTo(target: (current: number) => number, force: boolean): Promise<boolean> {
    const outcome = await enqueue(async () => {
      const current = entries.length - 1;
      const depth = Math.max(0, target(current));
      return depth < current ? settle(await travel(depth - current), force) : STAYED;
    });
    return outcome.left;
  }

  /** Back through the history to the shown tab's root; not in the history (a deep link) — it opens over the page. */
  function backToSection(): Promise<void> {
    return enqueue(async () => {
      const section = shown;
      if (section === null) {
        return;
      }
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.kind === 'page' && entry.row?.section === section) {
          if (i < entries.length - 1) {
            await settle(await travel(i - (entries.length - 1)));
          }
          return;
        }
      }
      push(page(
        sections[section], entries.length, section,
      ));
    });
  }

  /** A tab was tapped: its own stack, as it was left — or back to its root if it is the one shown. */
  async function switchSection(section: string): Promise<void> {
    if (shown === section) {
      await backToSection();
      return;
    }
    const root = sections[section];
    if (!root) {
      return;
    }
    await enqueue(async () => {
      dropWindows();
      publish();
      if (entries.length > 1) {
        await travel(-(entries.length - 1));
      }
      if (!stacks.has(section)) {
        stacks.set(section, [
          page(
            root, 0, section,
          ),
        ]);
      }
      rebuild(section);
    });
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
    if (entries.lastIndexOf(topPage(entries)) > 0) {
      await backTo(() => entries.lastIndexOf(topPage(entries)) - 1, false);
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

  /** Is the entry being left right now (its guards are being asked)? */
  const isClosing = (entryId: number): boolean => closing.has(entryId);

  /** The table, from the host: rows, tabs; every entry gets its row; tabs lay the stack out on first sight. */
  function setRoutes(routes: readonly TRouteRow[]): void {
    match = routeTableMatcher(routes);
    sections = {};
    for (const [
      pattern,
      row,
    ] of routes) {
      if (row.section !== undefined && !(row.section in sections)) {
        sections[row.section] = urlParse(pattern);
      }
    }
    homeSection = Object.keys(sections)[0] ?? null;
    const describe = (entry: TEntry): TEntry => (entry.kind === 'page' ? {
      ...page(
        entry.location, entry.depth, entry.section, entry.id,
      ),
      dormant: entry.dormant,
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
      return;
    }
    publish();
  }

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────

  const showLocation = router.attach({
    push: async (location) => {
      await go(location);
    },
    replace,
    back: (options?: TBackOptions) => (entries.length < 2 ? Promise.resolve(false) : backTo((current) => current - 1, !!options?.force)),
  });

  // A reload restores the stack the history kept; a first visit starts it from the address.
  const start = primitive.current();
  if (isNavData(start.data)) {
    restore(start.data);
    void enqueue(passGoneWindows);
  } else {
    reset(start.location);
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
  });

  return {
    $state,
    getState: () => state,
    open,
    close,
    startOver,
    leavePage,
    backToSection,
    switchSection,
    whileOpen,
    onForward,
    onBeforeLeave,
    isClosing,
    ...view,
  };
}

/** A navigator. */
export type TNavigator = ReturnType<typeof createNavigator>;
