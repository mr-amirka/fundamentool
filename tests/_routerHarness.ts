/**
 * A router over a fresh jsdom window, for the stack tests (pages, windows, sections, the view). `nav` names the
 * router's steps by what they do, with a path in place of a location; `browser` is the window's history seen from the
 * player's side (back, forward, the entries it holds).
 */
import * as React from 'react';
import {
  TextDecoder,
  TextEncoder,
} from 'util';
import {
  createApi,
  createObservable,
} from '../src/Observable';
import {
  routerProvider,
} from '../src/routerProvider';
import type {
  TEntry,
  TForwardHandler,
  TLeaveGuard,
  TOpenOptions,
  TPageInfo,
  TRouterProviderDeps,
} from '../src/routerProvider';

// jsdom (a fresh window per test) needs these; Jest's browser environment doesn't provide them.
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});
const {
  JSDOM,
} = require('jsdom') as typeof import('jsdom');

/** Routes of a small app: two sections, kept list pages, a "start over" page. */
export function describePath(path: string): TPageInfo {
  if (path === '/welcome') {
    return {
      startsOver: true,
    };
  }
  const section = path.split('/')[1] || 'home';
  return {
    section,
    sectionHome: path.split('/').length === 2,
    keep: path.includes('list'),
  };
}

/** Lets the window's history events and the router's timers run. */
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

/** The options a test may change; `describe` takes a path here. */
export type THarnessOptions = Omit<Partial<TRouterProviderDeps>, 'describe'> & { describe?: (path: string) => TPageInfo };

/** The router's dependencies from React, over `win`. */
export function reactDeps(win: Window) {
  return {
    window: win,
    Component: React.Component,
    useEffect: React.useEffect,
    useState: React.useState,
    useRef: React.useRef,
    createContext: React.createContext,
    useContext: React.useContext,
    createElement: React.createElement,
    forwardRef: React.forwardRef,
    createObservable,
    createApi,
  };
}

export function setup(overrides: THarnessOptions = {}, start = '/a') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: `http://localhost${start}`,
  });
  const win = dom.window as unknown as Window;

  // The browser's entries as the player sees them: pushes, replaces and moves are recorded.
  const stack: string[] = [start];
  let index = 0;
  const history = win.history;
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = (
    data: unknown, unused: string, url?: string | URL | null,
  ) => {
    pushState(
      data, unused, url,
    );
    stack.splice(
      index + 1, stack.length, win.location.pathname,
    );
    index++;
  };
  history.replaceState = (
    data: unknown, unused: string, url?: string | URL | null,
  ) => {
    replaceState(
      data, unused, url,
    );
    stack[index] = win.location.pathname;
  };
  win.addEventListener('popstate', (event: PopStateEvent) => {
    const depth = (event.state as { depth?: number } | null)?.depth;
    index = typeof depth === 'number' ? depth : stack.indexOf(win.location.pathname);
  });

  const {
    describe = describePath, ...rest
  } = overrides;
  const router = routerProvider({
    ...reactDeps(win),
    describe: (location) => describe(location.path || '/'),
    sections: {
      a: '/a',
      b: '/b',
    },
    // Long enough to see a window "leaving" under load; tests wait for the end with `waitFor`.
    exitMs: 200,
    ...rest,
  } as TRouterProviderDeps);

  const depthOf = (id: number) => router.$state.getState().entries.findIndex((entry) => entry.id === id);

  const nav = {
    getState: () => router.$state.getState(),
    subscribe: (listener: () => void) => router.$state.watch(listener),
    /** A new page; `false` if a forward handler cancelled it. */
    go: async (path: string) => {
      const before = router.getCurrentLocation();
      return (await router.pushLocation({
        path,
      })) !== before;
    },
    replace: async (path: string) => {
      await router.replaceLocation({
        path,
      });
    },
    open: <R = unknown>(window: unknown, params?: unknown, options?: TOpenOptions) => router.open<R>(
      window, params, options,
    ),
    close: router.close,
    /** One step back; `true` if the entry was left. */
    back: async () => {
      const response = await router.backLocation();
      return !!response && !response.locked;
    },
    backToSection: router.backToSection,
    switchSection: router.switchSection,
    startOver: (path: string) => router.startOverLocation({
      path,
    }),
    whileOpen: router.whileOpen,
    onForward: (
      id: number, handler: TForwardHandler, options?: { windows?: boolean },
    ) => router.onForward(
      id, handler, options,
    ),
    onBeforeLeave: (id: number, guard: TLeaveGuard) => router.onBeforeLeave(id, guard),
    isClosing: (id: number) => router.isTryClosingLocation(depthOf(id)),
  };

  const browser = {
    userBack: () => win.history.back(),
    userForward: () => win.history.forward(),
    userGo: (delta: number) => win.history.go(delta),
    index: () => index,
    paths: () => [...stack],
    path: () => win.location.pathname,
    state: () => win.history.state as unknown,
    /** An entry another session left (before a reload): the router starts over at its address. */
    foreign: (path: string) => {
      const data = {
        nav: 'old-session',
        depth: 3,
      };
      pushState(
        data, '', path,
      );
      win.dispatchEvent(new (win as unknown as { PopStateEvent: typeof PopStateEvent }).PopStateEvent('popstate', {
        state: data,
      }));
    },
    /** The browser refuses new entries (e.g. a quota) until `restore`. */
    refusePush: () => {
      const push = history.pushState;
      history.pushState = () => {
        throw new Error('quota');
      };
      return () => {
        history.pushState = push;
      };
    },
  };

  /** Each entry: a page's path or `window`. */
  const paths = () => nav.getState().entries.map((entry: TEntry) => (entry.kind === 'page' ? entry.location.path : 'window'));

  return {
    router,
    nav,
    browser,
    paths,
    win,
  };
}
