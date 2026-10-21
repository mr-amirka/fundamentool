/**
 * A navigator over a fresh jsdom window, for the stack tests (pages, windows, tabs, the view, reloads). `nav` names
 * the steps by what they do, with a path in place of a location; `browser` is the window's history seen from the
 * player's side (back, forward, the entries it holds) — and `reload()` opens the same history in a new window.
 */
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import {
  TextDecoder,
  TextEncoder,
} from 'util';
import {
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  browserHistoryPrimitivesProvider,
  createNavigator,
  createRouter,
  memoryHistoryPrimitivesProvider,
} from '../../src/router';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TNavigatorDeps,
  TOpenOptions,
  TRouteRow,
} from '../../src/router';

// jsdom (a fresh window per test) needs these; Jest's browser environment doesn't provide them.
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});
const {
  JSDOM,
} = require('jsdom') as typeof import('jsdom');

/** A page that draws its path. */
function Page({
  route,
}: { route: { location: { path?: string } } }) {
  return React.createElement(
    'p', null, route.location.path,
  );
}

/** The table of a small app: two tabs (`/a`, `/b`), kept list pages (`/a/list`, `/b/list2`), the rest plain pages. */
export const TABS: readonly TRouteRow[] = [
  [
    '/a',
    {
      main: Page,
      section: true,
    },
  ],
  [
    '/b',
    {
      main: Page,
      section: true,
    },
  ],
  [
    '/:tab/list(:n)?',
    {
      main: Page,
      keep: true,
    },
  ],
  [
    '/(.*)',
    {
      main: Page,
    },
  ],
];

/** The same app without tabs. */
export const PLAIN: readonly TRouteRow[] = [
  [
    '/:tab/list(:n)?',
    {
      main: Page,
      keep: true,
    },
  ],
  [
    '/(.*)',
    {
      main: Page,
    },
  ],
];

/** Lets the window's history events and the navigator's timers run. */
export function settle(ms = 5): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Waits until `check` passes. */
export async function waitFor(check: () => void, timeout = 3000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
      await settle(10);
    }
  }
}

/** The view library's part of the navigator's dependencies. */
export const REACT_DEPS = {
  createElement: React.createElement,
  forwardRef: React.forwardRef,
  useSyncExternalStore: React.useSyncExternalStore,
  useEffect: React.useEffect,
  useState: React.useState,
  useRef: React.useRef,
  createContext: React.createContext,
  useContext: React.useContext,
};

/** What a test may set: the navigator's settings and view library, the table (or none — no host). */
export type THarnessOptions = Partial<Omit<TNavigatorDeps, 'router' | 'createObservable' | 'createApi'>> & {
  routes?: readonly TRouteRow[] | null;
};

/** The browser's entries as the player sees them: each entry's path and the state the navigator wrote. */
type TRecorded = {
  paths: string[];
  states: unknown[];
  index: number;
};

/**
 * A fresh window at `start` — or at the entry `history` was left at, with its entries (a reload): up to that entry,
 * or (`ahead`) all of them, the window then at the last one (the caller moves it back).
 */
function openWindow(
  start: string, history?: TRecorded, ahead = false,
) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: `http://localhost${history ? history.paths[0] : start}`,
  });
  const win = dom.window as unknown as Window;
  const kept = history ? (ahead ? history.paths.length : history.index + 1) : 0;
  const recorded: TRecorded = history ? {
    paths: history.paths.slice(0, kept),
    states: history.states.slice(0, kept),
    index: kept - 1,
  } : {
    paths: [start],
    states: [null],
    index: 0,
  };
  const browserHistory = win.history;
  const pushState = browserHistory.pushState.bind(browserHistory);
  const replaceState = browserHistory.replaceState.bind(browserHistory);
  if (history) {
    // The browser keeps the entries over a reload: written back as they were.
    const count = kept;
    replaceState(
      history.states[0], '', history.paths[0],
    );
    for (let i = 1; i < count; i++) {
      pushState(
        history.states[i], '', history.paths[i],
      );
    }
  }
  // `refusePush` turns it on: the browser refuses new entries. A flag, not a swapped method — the primitives bind the
  // history's methods once, when they're created (D-035).
  let refusing = false;
  browserHistory.pushState = (
    data: unknown, unused: string, url?: string | URL | null,
  ) => {
    if (refusing) {
      throw new Error('quota');
    }
    pushState(
      data, unused, url,
    );
    recorded.index++;
    recorded.paths.splice(
      recorded.index, recorded.paths.length, win.location.pathname,
    );
    recorded.states.splice(
      recorded.index, recorded.states.length, data,
    );
  };
  browserHistory.replaceState = (
    data: unknown, unused: string, url?: string | URL | null,
  ) => {
    replaceState(
      data, unused, url,
    );
    recorded.paths[recorded.index] = win.location.pathname;
    recorded.states[recorded.index] = data;
  };
  win.addEventListener('popstate', (event: PopStateEvent) => {
    const index = (event.state as { index?: number } | null)?.index;
    recorded.index = typeof index === 'number' ? index : recorded.paths.indexOf(win.location.pathname);
  });
  return {
    win,
    recorded,
    refuse: (on: boolean) => {
      refusing = on;
    },
    pushState,
  };
}

/** A navigator (and its router) over a window. */
function build(win: Window, options: THarnessOptions) {
  const {
    routes = TABS,
    ...settings
  } = options;
  const router = createRouter({
    historyPrimitive: browserHistoryPrimitivesProvider(win).url,
    createObservable,
    createApi,
  });
  const nav = createNavigator({
    router,
    createObservable,
    createApi,
    ...REACT_DEPS,
    // Long enough to see a window "leaving" under load; tests wait for the end with `waitFor`.
    exitMs: 200,
    ...settings,
  });
  const NavigationHost = routes ? nav.NavigationHostProvider({
    routes,
  }) : null;
  return {
    router,
    nav,
    NavigationHost,
  };
}

/** Each entry: a page's path or `window`. */
function pathsOf(nav: ReturnType<typeof build>['nav']) {
  return nav.getState().entries.map((entry: TEntry) => (entry.kind === 'page' ? entry.location.path : 'window'));
}

export function setup(
  options: THarnessOptions = {}, start = '/a', from?: TRecorded,
) {
  return wire(
    openWindow(start, from), options, start,
  );
}

/** A navigator and the test's handles over an open window. */
function wire(
  opened: ReturnType<typeof openWindow>, options: THarnessOptions, start: string,
) {
  const {
    win,
    recorded,
    refuse,
    pushState,
  } = opened;
  const built = build(win, options);
  const {
    router,
    nav,
  } = built;

  const steps = {
    getState: () => nav.getState(),
    subscribe: (listener: () => void) => nav.$state.watch(listener),
    /** A new page; `false` if a forward handler cancelled it. */
    go: async (path: string) => {
      const before = nav.getState().page;
      await router.pushLocation({
        path,
      });
      return nav.getState().page !== before;
    },
    replace: async (path: string) => {
      await router.replaceLocation({
        path,
      });
    },
    open: <R = unknown>(window: unknown, params?: unknown, openOptions?: TOpenOptions) => nav.open<R>(
      window, params, openOptions,
    ),
    close: nav.close,
    /** One step back; `true` if the entry was left. */
    back: () => router.backLocation(),
    backToRoot: nav.backToRoot,
    backToDepth: nav.backToDepth,
    /** A tab tapped: a link to the section's root `/<name>` (D-043). */
    switchSection: (name: string) => router.pushLocation({
      path: '/' + name,
    }),
    startOver: (path: string) => nav.startOver({
      path,
    }),
    whileOpen: nav.whileOpen,
    onForward: (
      id: number, handler: TForwardHandler, forwardOptions?: { windows?: boolean },
    ) => nav.onForward(
      id, handler, forwardOptions,
    ),
    onBeforeLeave: (id: number, guard: TLeaveGuard) => nav.onBeforeLeave(id, guard),
    /** Whether the entry's leave is being confirmed (its guards are asked). */
    isConfirmingLeave: (id: number) => nav.isConfirmingLeave(id),
  };

  const browser = {
    userBack: () => win.history.back(),
    userForward: () => win.history.forward(),
    userGo: (delta: number) => win.history.go(delta),
    index: () => recorded.index,
    paths: () => [...recorded.paths],
    path: () => win.location.pathname,
    state: () => win.history.state as unknown,
    /** An entry nobody of ours wrote (another script's): the navigator starts over at its address. */
    foreign: (path: string) => {
      pushState(
        {
          other: true,
        }, '', path,
      );
      recorded.index++;
      recorded.paths.splice(
        recorded.index, recorded.paths.length, path,
      );
      recorded.states.splice(
        recorded.index, recorded.states.length, null,
      );
      win.dispatchEvent(new (win as unknown as { PopStateEvent: typeof PopStateEvent }).PopStateEvent('popstate', {
        state: {
          other: true,
        },
      }));
    },
    /** The browser refuses new entries (e.g. a quota) until the returned function is called. */
    refusePush: () => {
      refuse(true);
      return () => refuse(false);
    },
    /** The page reloads: a new window with this history, at the same entry; a new router and navigator over it. */
    reload: (reloadOptions: THarnessOptions = options) => setup(
      reloadOptions, start, recorded,
    ),
    /** The same, keeping the entries ahead too (the browser's Forward after the reload has somewhere to go). */
    reloadKeepingAhead: async (reloadOptions: THarnessOptions = options) => {
      const at = recorded.index;
      const next = openWindow(
        start, recorded, true,
      );
      const back = at - next.recorded.index;
      if (back) {
        await new Promise<void>((done) => {
          next.win.addEventListener(
            'popstate', () => done(), {
              once: true,
            },
          );
          next.win.history.go(back);
        });
        next.recorded.index = at;
      }
      return wire(
        next, reloadOptions, start,
      );
    },
  };

  return {
    router,
    navigator: nav,
    NavigationHost: built.NavigationHost,
    nav: steps,
    browser,
    paths: () => pathsOf(nav),
    win,
  };
}

/** A navigator's dependencies over the in-memory primitives (no window; the hash part): a router no navigator has yet. */
export function freshDeps(start = '/') {
  const history = memoryHistoryPrimitivesProvider(start);
  const router = createRouter({
    historyPrimitive: history.hash,
    createObservable,
    createApi,
  });
  const deps: TNavigatorDeps = {
    router,
    createObservable,
    createApi,
    ...REACT_DEPS,
  };
  return {
    history,
    router,
    deps,
  };
}

/** A navigator over the in-memory primitives. */
export function inMemory(start = '/') {
  const fresh = freshDeps(start);
  return {
    ...fresh,
    nav: createNavigator(fresh.deps),
  };
}

/** Renders `view` (React) into a fresh element; returns it and the unmount. */
export function mount(view: () => unknown) {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(React.createElement(view as () => React.ReactElement)));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
}
