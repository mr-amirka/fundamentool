// The router's engine (fundamentool D-022…D-037): the stack of pages and windows in step with the browser history —
// pushes, replaces, back steps, windows, sections, guards — and the router's API built over it. Its parts: the state
// from the stack (`state.ts`), the address observables (`addressModel.ts`), the host and hooks (`view.ts`), links,
// param storage, option checks.
import {
  attachEvent,
} from '../attachEvent';
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
  once,
} from '../once';
import {
  keyedRegistry,
} from '../keyedRegistry';
import {
  queueProvider,
} from '../queueProvider';
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
  keys,
} from '../keys';
import type {
  TBackLocationResponse,
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TLeavePageOptions,
  TLocationNavigationOptions,
  TLocationOptions,
  TLockWatcherFn,
  TLockWatcherOptions,
  TOpenOptions,
  TPageEntry,
  TPageInfo,
  TRouterProviderDeps,
  TRouterState,
  TWindowEntry,
} from './types';
import type {
  TForwardItem,
  TOpenedEffect,
  TOurState,
  TOutcome,
} from './internalTypes';
import {
  CLOSE,
  DEFAULT_LOCK_WATCHER_OPTIONS,
  LEAVE_PAGE_OPTION_KEYS,
  LEFT,
  PAGE,
  REOPEN,
  ROUTER_WHERE,
  SEPARATE,
  STAYED,
  WINDOW,
} from './constants';
import {
  assertOpenOptions,
  assertRouterDeps,
} from './options';
import {
  getChild,
  mergeLocation,
} from './location';
import {
  createAddressModel,
} from './addressModel';
import {
  computeState,
  topPage,
} from './state';
import {
  routerForObservableMapProvider,
} from './routeMap';
import {
  createLinkProvider,
  createNavLinkProvider,
} from './links';
import {
  createParamStorageProvider,
} from './paramStorage';
import {
  createRouterView,
} from './view';

/**
 * The router (fundamentool D-022, D-025): an address model (path, query, the hash part as a child location) and a
 * stack of pages and windows in step with the browser history — every page and every window is a history entry, so
 * back (browser, Android, Escape) closes the top one; Forward brings back what back left (D-024); covered pages can
 * stay mounted; sections keep their own history. `hash` — the hash part is the location (`hashRouterProvider`).
 */
export function routerProviderBase(deps: TRouterProviderDeps, hash: boolean) {
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
  for (const [
    name,
    path,
  ] of Object.entries(deps.sections ?? {})) {
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
    return computeState({
      entries,
      leaving,
      ahead,
      stacks,
      shown,
      separate,
      keepLimit,
    });
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
      : [
        (stacks.get(homeSection) as TEntry[])[0],
        ...(stacks.get(section) as TEntry[]),
      ];
    return list.map((entry, depth) => (entry.depth === depth ? entry : {
      ...entry,
      depth,
    }));
  }

  /** The browser is at its first entry — write a section's stack into the history and show it. */
  function rebuild(section: string): void {
    const list = layout(section);
    const listLength = list.length;
    replaceState(
      mark(list[0]), '', hrefOf(list[0]),
    );
    for (let i = 1; i < listLength; i++) {
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
    ahead = stop < 0 ? [
      ...removed,
      ...ahead,
    ] : removed.slice(0, stop);
    const windows = removed.filter((entry): entry is TWindowEntry => entry.kind === WINDOW);
    for (const entry of removed) {
      forget(entry);
    }
    leaving = [
      ...leaving,
      ...windows,
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
    entries = [
      ...entries,
      ...restore,
    ];
    publish();
  }

  function reset(location: TUrlProps): void {
    const all = [
      ...entries,
      ...[...stacks].filter(([name]) => name !== shown).flatMap(([, list]) => list),
    ];
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
    entries = [
      ...entries,
      entry,
    ];
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
      entries = [
        ...entries.slice(0, index),
        fresh,
      ];
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

  const address = createAddressModel($state, $transitionState);
  const {
    $location,
    $query,
    $hashLocation,
    $hashQuery,
  } = address;
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
    $state,
    $transitionState,
    // The address observables: $location, $path, $query, the hash part, $immediate…, $prev… (`addressModel.ts`).
    ...address,

    LinkProvider,
    routerForObservableMapProvider,
    paramStorageProvider,
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
