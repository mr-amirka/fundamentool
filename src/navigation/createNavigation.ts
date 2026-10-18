import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import type {
  THistoryPort,
} from './history';

/**
 * What the app tells the core about a page path (the core knows no routes): whether its layer is kept when covered,
 * which section (tab) it belongs to, whether it is that section's main page, whether opening it starts over.
 */
export type TPageInfo = {
  /** Keep the page mounted (hidden) while other pages cover it — it returns with its scroll and state (D-011). */
  keep?: boolean;
  /** The section (tab) the page belongs to. */
  section?: string;
  /** The page a section opens with — `backToSection` returns here. */
  sectionHome?: boolean;
  /** Opening this page drops everything before it (D-014: "start over"). */
  startsOver?: boolean;
};

/** A page in the stack. */
export type TPageEntry = {
  kind: 'page';
  id: number;
  depth: number;
  path: string;
  info: TPageInfo;
};

/** A window in the stack: what to render and with what. */
export type TWindowEntry = {
  kind: 'window';
  id: number;
  depth: number;
  window: unknown;
  params: unknown;
};

export type TEntry = TPageEntry | TWindowEntry;

/** The navigation state: the stack, the windows playing their exit, the pages kept mounted. */
export type TNavigationState = {
  /** Bottom to top; `entries[i].depth === i`. */
  entries: readonly TEntry[];
  /** Windows just closed — still rendered (closed) while they play their exit. */
  leaving: readonly TWindowEntry[];
  /** Pages whose layers stay mounted: the top page and the kept ones within the limit. */
  mounted: ReadonlySet<number>;
  /** The top page — the one shown. */
  page: TPageEntry;
  /** Every mounted page layer, of every section, in creation order (a stable order keeps layers in place in the DOM). */
  layers: readonly TPageEntry[];
  /** The section lit in the tab bar: the nearest page with a section, from the top down. */
  section: string | null;
};

/** What runs when something opens over a page; see {@link TNavigation.onForward}. */
export type TForwardHandler = () => void | false | (() => void) | Promise<void | false | (() => void)>;

/** Asked before an entry is left by going back; `false` keeps it. */
export type TLeaveGuard = () => boolean | Promise<boolean>;

/** Options of {@link createNavigation}. */
export type TNavigationOptions = {
  /** The browser history (or a fake one in tests). */
  history: THistoryPort;
  /** What a page path means — keep / section / start over. */
  describe: (path: string) => TPageInfo;
  /** Section → its main page path; `backToSection` uses it when the main page isn't in the history. */
  sections?: Readonly<Record<string, string>>;
  /** How many covered pages flagged `keep` stay mounted (the oldest are dropped first). Default 10. */
  keep?: number;
  /** How long a closed window stays rendered for its exit animation, ms. Default 300. */
  exitMs?: number;
  /** Timer (tests). Default `setTimeout`. */
  schedule?: (callback: () => void, ms: number) => void;
  /**
   * `shared` (default) — one history for the whole app. `separate` — every section (tab) keeps its own stack: switching
   * tabs shows that tab as it was left; back goes back inside the tab, and from a tab's main page to the first tab
   * (the first key of `sections`). Needs `sections`.
   */
  sectionHistory?: 'shared' | 'separate';
};

/** The single list of accepted option keys of {@link createNavigation} — checked against the type in tests. */
export const NAVIGATION_OPTION_KEYS = [
  'history',
  'describe',
  'sections',
  'keep',
  'exitMs',
  'schedule',
  'sectionHistory',
] as const;

const WHERE = '[fundamentool] createNavigation';

/** Throws "what was expected, what came" for one option. */
function invalid(
  key: string, expected: string, value: unknown,
): TypeError {
  return new TypeError(`${WHERE}: option "${key}" expects ${expected}, got ${describeValue(value)}`);
}

/**
 * Checks the options once, at creation (lab convention `api-input-validation.md`): an unknown key — "did you mean";
 * a wrong value — what was expected and what came.
 *
 * @param options - What the caller passed.
 * @throws {TypeError} On the first problem found.
 */
function assertOptions(options: unknown): asserts options is TNavigationOptions {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(options)}`);
  }
  assertKnownOptions(
    WHERE, options, NAVIGATION_OPTION_KEYS,
  );
  const raw = options as Record<string, unknown>;
  const history = raw.history as Record<string, unknown> | null;
  const methods = [
    'state',
    'path',
    'push',
    'replace',
    'go',
    'listen',
  ];
  if (typeof history !== 'object' || history === null || !methods.every((name) => typeof history[name] === 'function')) {
    throw invalid(
      'history', `a history port { ${methods.join(', ')} } (e.g. createBrowserHistory(window))`, history,
    );
  }
  if (typeof raw.describe !== 'function') {
    throw invalid(
      'describe', 'a function (path) => page info', raw.describe,
    );
  }
  const sections = raw.sections;
  if (sections !== undefined && (typeof sections !== 'object' || sections === null || Array.isArray(sections)
    || !Object.values(sections).every((path) => typeof path === 'string'))) {
    throw invalid(
      'sections', 'an object section → main page path', sections,
    );
  }
  for (const key of ['keep', 'exitMs']) {
    const value = raw[key];
    if (value !== undefined && !(typeof value === 'number' && value >= 0 && Number.isFinite(value))) {
      throw invalid(
        key, 'a number ≥ 0', value,
      );
    }
  }
  if (raw.schedule !== undefined && typeof raw.schedule !== 'function') {
    throw invalid(
      'schedule', 'a function (callback, ms)', raw.schedule,
    );
  }
  if (raw.sectionHistory !== undefined && raw.sectionHistory !== 'shared' && raw.sectionHistory !== 'separate') {
    throw invalid(
      'sectionHistory', '"shared" or "separate"', raw.sectionHistory,
    );
  }
}

/** The navigation core. */
export type TNavigation = {
  getState: () => TNavigationState;
  subscribe: (listener: (state: TNavigationState) => void) => () => void;
  /** Opens a page over the current one; `false` if a forward handler cancelled it. */
  go: (path: string) => Promise<boolean>;
  /**
   * Swaps the top page for another one in place — no new history entry (e.g. "next level": back still leads home).
   * Windows over it close first (their leave guards are asked); the old page's `whileOpen` cleanups run.
   */
  replace: (path: string) => Promise<void>;
  /** Opens a window; resolves with what it closed with (`null` — closed by back / backdrop / Escape / cancelled). */
  open: <R = unknown>(window: unknown, params?: unknown) => Promise<R | null>;
  /** Closes a window with a result (and every entry above it). */
  close: (entryId: number, result?: unknown) => Promise<void>;
  /** One step back — like the browser's or Android's back. */
  back: () => Promise<void>;
  /** Back through history to the current section's main page. */
  backToSection: () => Promise<void>;
  /** A tab was tapped: its section (its own stack with `separate` history) — or back to its main page if it is current. */
  switchSection: (section: string) => Promise<void>;
  /** Drops every page and window and opens `path` alone (D-014) — sign out, switching account. */
  startOver: (path: string) => Promise<void>;
  /** Runs `effect` now; its cleanup runs when the entry starts closing, and it runs again if closing is refused. */
  whileOpen: (entryId: number, effect: () => void | (() => void)) => () => void;
  /** `handler` runs when a page (or, with `windows`, a window) is about to open over this entry. */
  onForward: (entryId: number, handler: TForwardHandler, options?: { windows?: boolean }) => () => void;
  /** `guard` is asked before this entry is left by going back. */
  onBeforeLeave: (entryId: number, guard: TLeaveGuard) => () => void;
};

/** What the core writes into `history.state`: whose entry it is and how deep. */
type TOurState = { nav: string;
  depth: number };

/**
 * The navigation core (fundamentool D-011…D-019; proven in the web-games navigation lab, D-012): a stack of pages and
 * windows in step with the browser history — every page and every window is a history entry, so back (browser, Android, Escape)
 * closes the top one. No view library inside; `createNavigationView` renders it.
 *
 * @example
 * const nav = createNavigation({ history: createBrowserHistory(window), describe: (path) => ROUTES.info(path) });
 * await nav.go('/notes/3');
 * const text = await nav.open(EditWindow, { text: 'Hi' }); // null if closed without saving
 */
export function createNavigation(options: TNavigationOptions): TNavigation {
  assertOptions(options);
  const {
    history, describe, 
  } = options;
  const sections = options.sections ?? {};
  const keepLimit = options.keep ?? 10;
  const exitMs = options.exitMs ?? 300;
  const schedule = options.schedule ?? ((callback, ms) => {
    setTimeout(callback, ms);
  });
  const session = Math.random().toString(36).slice(2);
  const separate = options.sectionHistory === 'separate';
  const homeSection = Object.keys(sections)[0];
  if (separate && !homeSection) {
    throw new TypeError('createNavigation: sectionHistory "separate" needs `sections`');
  }
  /** `separate`: each section's own stack, and the section shown. */
  const stacks = new Map<string, TEntry[]>();
  let shown = homeSection;
  const listeners = new Set<(state: TNavigationState) => void>();

  let nextId = 1;
  let entries: TEntry[] = [];
  let leaving: TWindowEntry[] = [];
  let state: TNavigationState;

  /** Window results and resolvers, by entry id. */
  const results = new Map<number, unknown>();
  const resolvers = new Map<number, (result: unknown) => void>();
  /** Registered hooks, by entry id. */
  const opened = new Map<number, Set<{ effect: () => void | (() => void);
    cleanup: (() => void) | void }>>();
  const forward = new Map<number, Set<{ handler: TForwardHandler;
    windows: boolean }>>();
  const guards = new Map<number, Set<TLeaveGuard>>();
  /** Cleanups returned by forward handlers — run when their entry is on top again. */
  const returns = new Map<number, (() => void)[]>();

  function page(path: string, depth: number): TPageEntry {
    return {
      kind: 'page',
      id: nextId++,
      depth,
      path,
      info: describe(path), 
    };
  }

  function topPage(list: readonly TEntry[]): TPageEntry {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].kind === 'page') {
        return list[i] as TPageEntry;
      }
    }
    /* istanbul ignore next -- the bottom entry is always a page */
    throw new Error('navigation: no page in the stack');
  }

  function publish(): void {
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
        if (entry.kind !== 'page') {
          continue;
        }
        if (!separate && list === entries) {
          section ??= entry.info.section ?? null;
        }
        if (mounted.has(entry.id)) {
          continue;
        }
        if (entry.info.keep && kept < keepLimit) {
          mounted.add(entry.id);
          layers.push(entry);
          kept++;
        }
      }
    }
    layers.sort((a, b) => a.id - b.id);
    state = {
      entries,
      leaving,
      mounted,
      page: top,
      section,
      layers, 
    };
    listeners.forEach((listener) => listener(state));
  }

  /** `separate`: the section a path belongs to (unknown → the first section). */
  function sectionOf(path: string): string {
    const section = describe(path).section;
    return section !== undefined && section in sections ? section : homeSection;
  }

  /** `separate`: what the browser history holds for a section — the first section's main page under it, then its stack. */
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

  /** `separate`: the browser is at its first entry — write a section's stack into the history and show it. */
  function rebuild(section: string): void {
    const list = layout(section);
    history.replace({
      nav: session,
      depth: 0, 
    } satisfies TOurState, (list[0] as TPageEntry).path);
    for (let i = 1; i < list.length; i++) {
      history.push({
        nav: session,
        depth: i, 
      } satisfies TOurState, (list[i] as TPageEntry).path);
    }
    entries = list;
    shown = section;
    publish();
  }

  /** Windows can't wait in a hidden stack: those of the shown stack close (resolve `null`) before a switch. */
  function dropWindows(): void {
    const first = entries.findIndex((entry) => entry.kind === 'window');
    if (first < 0) {
      return;
    }
    const windows = entries.slice(first) as TWindowEntry[];
    runOpened(windows, 'close');
    entries = entries.slice(0, first);
    for (const entry of windows) {
      forget(entry);
      resolvers.get(entry.id)?.(null);
      resolvers.delete(entry.id);
      results.delete(entry.id);
    }
  }

  // ── history ───────────────────────────────────────────────────────────────────────────────────────────────────

  function isOurs(value: unknown): value is TOurState {
    return typeof value === 'object' && value !== null && (value as TOurState).nav === session
      && typeof (value as TOurState).depth === 'number';
  }

  /** A travel we started: the next history event is its answer, not the player's. */
  let waiter: ((value: unknown) => void) | null = null;

  function travel(delta: number): Promise<unknown> {
    return new Promise((resolve) => {
      waiter = resolve;
      history.go(delta);
    });
  }

  /** One navigation step at a time. */
  let chain: Promise<unknown> = Promise.resolve();
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = chain.then(work);
    chain = result.catch(() => undefined);
    return result;
  }

  // ── stack changes ─────────────────────────────────────────────────────────────────────────────────────────────

  function runOpened(list: readonly TEntry[], phase: 'close' | 'reopen'): void {
    for (let i = list.length - 1; i >= 0; i--) {
      opened.get(list[i].id)?.forEach((item) => {
        if (phase === 'close') {
          const cleanup = item.cleanup;
          item.cleanup = undefined;
          if (typeof cleanup === 'function') {
            cleanup();
          }
        } else {
          item.cleanup = item.effect();
        }
      });
    }
  }

  function forget(entry: TEntry): void {
    opened.delete(entry.id);
    forward.delete(entry.id);
    guards.delete(entry.id);
    returns.delete(entry.id);
  }

  /** Removes every entry above `depth`: windows resolve and play their exit; the new top's return cleanups run. */
  function removeAbove(depth: number): void {
    const removed = entries.slice(depth + 1);
    entries = entries.slice(0, depth + 1);
    const windows = removed.filter((entry): entry is TWindowEntry => entry.kind === 'window');
    for (const entry of removed) {
      forget(entry);
    }
    leaving = [...leaving, ...windows];
    const top = entries[entries.length - 1];
    const back = returns.get(top.id);
    returns.delete(top.id);
    publish();
    for (const entry of windows) {
      const result = results.has(entry.id) ? results.get(entry.id) : null;
      results.delete(entry.id);
      resolvers.get(entry.id)?.(result);
      resolvers.delete(entry.id);
    }
    back?.forEach((cleanup) => cleanup());
    if (windows.length) {
      schedule(() => {
        leaving = leaving.filter((entry) => !windows.includes(entry));
        publish();
      }, exitMs);
    }
  }

  /**
   * The browser is now at `value` — make the stack match. Going back past entries with leave guards: step forward
   * again, ask the guards (they may open windows, so outside the queue), and leave only if all agree.
   */
  async function settle(value: unknown): Promise<void> {
    const current = entries.length - 1;
    if (!isOurs(value)) {
      reset(history.path());
      return;
    }
    const target = value.depth;
    if (target >= current) {
      if (target > current) {
        await travel(current - target); // no forward stack: the browser's "forward" is undone
      }
      return;
    }
    if (separate && target === 0 && shown !== homeSection) {
      // Back past a section's main page: that section keeps its main page, the first section is shown.
      const removed = entries.slice(2);
      runOpened(removed, 'close');
      const asked = removed.flatMap((entry) => [...(guards.get(entry.id) ?? [])]).reverse();
      if (asked.length) {
        await travel(current);
        void confirmLeave(
          1, removed, asked,
        );
        return;
      }
      removeAbove(1);
      rebuild(homeSection);
      return;
    }
    const removed = entries.slice(target + 1);
    runOpened(removed, 'close');
    const asked: TLeaveGuard[] = [];
    for (let i = removed.length - 1; i >= 0; i--) {
      guards.get(removed[i].id)?.forEach((guard) => asked.push(guard));
    }
    if (!asked.length) {
      removeAbove(target);
      return;
    }
    await travel(current - target);
    void confirmLeave(
      target, removed, asked,
    );
  }

  async function confirmLeave(
    target: number, removed: readonly TEntry[], asked: readonly TLeaveGuard[],
  ): Promise<void> {
    for (const guard of asked) {
      if (!(await guard())) {
        runOpened(removed, 'reopen');
        return;
      }
    }
    await enqueue(async () => {
      const current = entries.length - 1;
      if (current > target) {
        await travel(target - current);
        removeAbove(target);
      }
    });
  }

  function reset(path: string): void {
    const all = [...entries, ...[...stacks].filter(([name]) => name !== shown).flatMap(([, list]) => list)];
    runOpened(entries, 'close');
    stacks.clear();
    if (separate) {
      shown = sectionOf(path);
      stacks.set(shown, [page(path, 0)]);
      entries = layout(shown);
      history.replace({
        nav: session,
        depth: 0, 
      } satisfies TOurState, (entries[0] as TPageEntry).path);
      if (entries.length > 1) {
        history.push({
          nav: session,
          depth: 1, 
        } satisfies TOurState, path);
      }
    } else {
      entries = [page(path, 0)];
      history.replace({
        nav: session,
        depth: 0, 
      } satisfies TOurState, path);
    }
    for (const entry of all) {
      forget(entry);
      if (entry.kind === 'window') {
        resolvers.get(entry.id)?.(null);
        resolvers.delete(entry.id);
        results.delete(entry.id);
      }
    }
    publish();
  }

  /** Asks the forward handlers of the top entry; `false` — cancelled. Runs outside the queue (handlers may open windows). */
  async function askForward(kind: 'page' | 'window'): Promise<boolean> {
    const top = entries[entries.length - 1];
    const handlers = [...(forward.get(top.id) ?? [])].filter((item) => kind === 'page' || item.windows);
    for (const {
      handler, 
    } of handlers) {
      const answer = await handler();
      if (answer === false) {
        return false;
      }
      if (typeof answer === 'function') {
        returns.set(top.id, [...(returns.get(top.id) ?? []), answer]);
      }
    }
    return true;
  }

  /** History first: if the browser refuses the entry, the stack stays as it was. */
  function push(entry: TEntry, path: string): void {
    history.push({
      nav: session,
      depth: entry.depth, 
    } satisfies TOurState, path);
    entries = [...entries, entry];
    publish();
  }

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────

  // A reload or a deep link starts from the page in the address; windows are never reopened (D-011).
  reset(history.path());
  history.listen((value) => {
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve(value);
      return;
    }
    void enqueue(() => settle(value));
  });

  const nav: TNavigation = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    go: async (path) => {
      if (describe(path).startsOver) {
        await nav.startOver(path);
        return true;
      }
      if (!(await askForward('page'))) {
        return false;
      }
      await enqueue(async () => push(page(path, entries.length), path));
      return true;
    },
    replace: (path) => enqueue(async () => {
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
      history.replace({
        nav: session,
        depth: index, 
      } satisfies TOurState, path);
      entries = [...entries.slice(0, index), page(path, index)];
      publish();
    }),
    open: async <R>(window: unknown, params?: unknown) => {
      if (!(await askForward('window'))) {
        return null;
      }
      return new Promise<R | null>((resolve) => {
        void enqueue(async () => {
          const entry: TWindowEntry = {
            kind: 'window',
            id: nextId++,
            depth: entries.length,
            window,
            params, 
          };
          resolvers.set(entry.id, resolve as (result: unknown) => void);
          push(entry, topPage(entries).path);
        });
      });
    },
    close: (entryId, result) => enqueue(async () => {
      const entry = entries.find((item) => item.id === entryId);
      if (!entry || entry.depth === 0) {
        return;
      }
      if (result !== undefined) {
        results.set(entryId, result);
      }
      await settle(await travel(entry.depth - 1 - (entries.length - 1)));
    }),
    back: () => enqueue(async () => {
      if (entries.length > 1) {
        await settle(await travel(-1));
      }
    }),
    backToSection: () => enqueue(async () => {
      const section = state.section;
      if (section === null) {
        return;
      }
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.kind === 'page' && entry.info.section === section && entry.info.sectionHome) {
          if (i < entries.length - 1) {
            await settle(await travel(i - (entries.length - 1)));
          }
          return;
        }
      }
      const home = sections[section];
      if (home) {
        push(page(home, entries.length), home);
      }
    }),
    switchSection: async (section) => {
      if (state.section === section) {
        await nav.backToSection();
        return;
      }
      const home = sections[section];
      if (!home) {
        return;
      }
      if (!separate) {
        await nav.go(home);
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
    },
    startOver: (path) => enqueue(async () => {
      const current = entries.length - 1;
      if (current > 0) {
        await travel(-current);
      }
      reset(path);
    }),
    whileOpen: (entryId, effect) => {
      const item = {
        effect,
        cleanup: effect(), 
      };
      const set = opened.get(entryId) ?? new Set();
      opened.set(entryId, set.add(item));
      return () => {
        set.delete(item);
        const cleanup = item.cleanup;
        item.cleanup = undefined;
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    },
    onForward: (
      entryId, handler, handlerOptions,
    ) => {
      const item = {
        handler,
        windows: Boolean(handlerOptions?.windows), 
      };
      const set = forward.get(entryId) ?? new Set();
      forward.set(entryId, set.add(item));
      return () => {
        set.delete(item);
      };
    },
    onBeforeLeave: (entryId, guard) => {
      const set = guards.get(entryId) ?? new Set();
      guards.set(entryId, set.add(guard));
      return () => {
        set.delete(guard);
      };
    },
  };
  return nav;
}
