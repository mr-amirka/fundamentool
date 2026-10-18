/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * routerProvider's behaviour as its users (space-amirka-name, affiliate) rely on it — written before the router is
 * rebuilt on the navigation core (D-022), so the rebuild keeps it. Each test gets its own browser window: the router
 * attaches itself to the window for good.
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
} from '../src/Observable';
import {
  hashRouterProvider,
  routerProvider,
} from '../src/routerProvider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom (a fresh window per test) needs these, Jest's browser environment doesn't provide them.
Object.assign(globalThis, {
  TextEncoder,
  TextDecoder, 
});
const {
  JSDOM, 
} = require('jsdom') as typeof import('jsdom');

/** A router over a fresh window at `url`. */
function setup(url = 'http://localhost/start?x=1#/h?y=2', kind: 'path' | 'hash' = 'path') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url, 
  });
  const win = dom.window as unknown as Window;
  const deps = {
    window: win,
    Component: React.Component,
    useEffect: React.useEffect,
    createElement: React.createElement,
    forwardRef: React.forwardRef,
    createObservable,
    createApi,
  };
  const router = kind === 'hash' ? hashRouterProvider(deps as never) : routerProvider(deps as never);
  return {
    router,
    win, 
  };
}

/** Lets the window's history events and the router's timers run. */
function settle(ms = 120): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Waits until `check` passes. */
async function waitFor(check: () => void, timeout = 4000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
      await settle(20);
    }
  }
}

describe('routerProvider — the address', () => {
  it('starts from the window\'s address: path, query, the hash part as a child location', () => {
    const {
      router, 
    } = setup();
    // Query values are parsed: '1' → 1.
    expect(router.$location.getState()).toMatchObject({
      path: '/start',
      query: {
        x: 1, 
      }, 
    });
    expect(router.$path.getState()).toBe('/start');
    expect(router.$query.getState()).toEqual({
      x: 1, 
    });
    expect(router.$hashPath.getState()).toBe('/h');
    expect(router.$hashQuery.getState()).toEqual({
      y: 2, 
    });
    expect(router.$historyDepth.getState()).toBe(0);
    expect(router.getCurrentLocation()).toMatchObject({
      path: '/start', 
    });
  });

  it('pushLocation: a new history entry, the address and the state follow; prev / from are the page before', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushLocation({
      path: '/a',
      query: {
        q: 'v', 
      }, 
    });
    expect(win.location.pathname).toBe('/a');
    expect(win.location.search).toBe('?q=v');
    expect(router.$path.getState()).toBe('/a');
    expect(router.$query.getState()).toEqual({
      q: 'v', 
    });
    expect(router.$historyDepth.getState()).toBe(1);
    expect(router.$state.getState().depth).toBe(1);
    expect(router.getPrevLocation()).toMatchObject({
      path: '/start', 
    });
    expect(router.getFromLocation()).toMatchObject({
      path: '/start', 
    });
    expect(router.getHistory().map((loc) => loc.path)).toEqual(['/start', '/a']);
  });

  it('replaceLocation: the same depth, a new address', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushLocation({
      path: '/a', 
    });
    await router.replaceLocation({
      path: '/b', 
    });
    expect(win.location.pathname).toBe('/b');
    expect(router.$historyDepth.getState()).toBe(1);
  });

  it('the hash part is a location of its own: pushHashLocation / replaceHashLocation', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushHashLocation({
      path: '/screen',
      query: {
        k: '1', 
      }, 
    });
    expect(win.location.hash).toBe('#/screen?k=1');
    expect(router.$hashPath.getState()).toBe('/screen');
    expect(router.$path.getState()).toBe('/start');
    await router.replaceHashLocation({
      path: '/other', 
    });
    expect(router.$hashPath.getState()).toBe('/other');
    expect(router.$historyDepth.getState()).toBe(1);
  });

  it('pushParam / replaceParam change only the query', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushParam({
      page: '2', 
    });
    expect(win.location.search).toBe('?page=2');
    expect(router.$historyDepth.getState()).toBe(1);
    await router.replaceParam({
      page: '3', 
    });
    expect(router.$query.getState()).toEqual({
      page: '3', 
    });
    expect(router.$historyDepth.getState()).toBe(1);
  });

  it('a quiet push changes the address but not the state', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushLocation({
      path: '/quiet', 
    }, {
      quiet: true, 
    });
    expect(win.location.pathname).toBe('/quiet');
    expect(router.$path.getState()).toBe('/start');
  });
});

describe('routerProvider — going back', () => {
  it('backLocation: one step back, resolves unlocked; at the start it does nothing', async () => {
    const {
      router, win, 
    } = setup();
    await expect(router.backLocation()).resolves.toBeUndefined();
    await router.pushLocation({
      path: '/a', 
    });
    await expect(router.backLocation()).resolves.toEqual({
      locked: false, 
    });
    expect(win.location.pathname).toBe('/start');
    expect(router.$historyDepth.getState()).toBe(0);
  });

  it('backToDepth / backRepeat / backToStart', async () => {
    const {
      router, 
    } = setup();
    for (const path of [
      '/a',
      '/b',
      '/c',
      '/d',
    ]) {
      await router.pushLocation({
        path, 
      });
    }
    await router.backRepeat(1);
    expect(router.$path.getState()).toBe('/c');
    await router.backToDepth(1);
    expect(router.$path.getState()).toBe('/a');
    await router.pushLocation({
      path: '/e', 
    });
    await router.backToStart();
    expect(router.$path.getState()).toBe('/start');
    expect(router.$historyDepth.getState()).toBe(0);
  });

  it('the browser\'s back moves the state too', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushLocation({
      path: '/a', 
    });
    win.history.back();
    await waitFor(() => expect(router.$path.getState()).toBe('/start'));
    expect(router.$historyDepth.getState()).toBe(0);
  });

  it('onBeforeUnload: a watcher returning false keeps the page (locked); unsubscribed — back works', async () => {
    const {
      router, win, 
    } = setup();
    await router.pushLocation({
      path: '/form', 
    });
    const stop = router.onBeforeUnload(() => false);
    expect(router.isWaitingUnloadCurrentLocation()).toBe(true);
    await expect(router.backLocation()).resolves.toEqual({
      locked: true, 
    });
    await settle();
    expect(router.$path.getState()).toBe('/form');
    expect(win.location.pathname).toBe('/form');
    stop();
    expect(router.isWaitingUnloadCurrentLocation()).toBe(false);
    await expect(router.backLocation()).resolves.toEqual({
      locked: false, 
    });
    expect(router.$path.getState()).toBe('/start');
  });

  it('onBeforeUnload: an async yes lets the page go; the watcher gets the page\'s location', async () => {
    const {
      router, 
    } = setup();
    await router.pushLocation({
      path: '/form', 
    });
    const seen: string[] = [];
    router.onBeforeUnload(async (loc) => {
      seen.push(loc.path);
      return true;
    });
    await expect(router.backLocation()).resolves.toEqual({
      locked: false, 
    });
    expect(seen).toEqual(['/form']);
    expect(router.$path.getState()).toBe('/start');
  });

  it('a push can bring its own watcher (options.onBeforeUnload)', async () => {
    const {
      router, 
    } = setup();
    await router.pushLocation({
      path: '/edit', 
    }, {
      onBeforeUnload: () => false, 
    });
    await expect(router.backLocation()).resolves.toEqual({
      locked: true, 
    });
    expect(router.$path.getState()).toBe('/edit');
  });

  it('backToDepth stops at a locked page', async () => {
    const {
      router, 
    } = setup();
    await router.pushLocation({
      path: '/a', 
    });
    await router.pushLocation({
      path: '/form', 
    }, {
      onBeforeUnload: () => false, 
    });
    await router.pushLocation({
      path: '/c', 
    });
    await expect(router.backToStart()).resolves.toEqual({
      locked: true, 
    });
    expect(router.$path.getState()).toBe('/form');
  });
});

describe('routerProvider — routes, params, links, focus', () => {
  it('routerByLocationProvider maps the location to a route with params; not found → the fallback', async () => {
    const {
      router, 
    } = setup();
    const $route = router.routerByLocationProvider<{ page: string }>([['/user/:id', (params) => ({
      page: `user ${params.id}`, 
    })]],
    () => ({
      page: 'not found', 
    }));
    expect($route.getState().page).toBe('not found');
    await router.pushLocation({
      path: '/user/42', 
    });
    expect($route.getState()).toMatchObject({
      page: 'user 42',
      params: {
        id: '42', 
      }, 
    });
  });

  it('paramStorage: query keys as a store — set / get / remove, change events per key', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    const events: unknown[] = [];
    router.paramStorage.watch((event: unknown) => events.push(event));
    router.paramStorage.set('tab', 'b');
    await settle();
    expect(router.$query.getState()).toEqual({
      tab: 'b', 
    });
    expect(router.paramStorage.get('tab')).toBe('b');
    expect(router.paramStorage.getKeys()).toEqual(['tab']);
    router.paramStorage.remove('tab');
    await settle();
    expect(events).toEqual(expect.arrayContaining([{
      key: 'tab',
      value: 'b', 
    }]));
  });

  it('Link pushes its href on click; NavLink marks itself active', async () => {
    const {
      router, win, 
    } = setup('http://localhost/');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(React.createElement(
      'div', null,
      React.createElement(
        router.Link, {
          href: '/go', 
        }, 'go',
      ),
      React.createElement(
        router.NavLink, {
          href: '/', 
        }, 'home',
      ),
    )));
    const links = host.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('/go');
    expect(links[1].className).toContain('active');
    await act(async () => {
      links[0].dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true, 
      }));
      await settle();
    });
    expect(win.location.pathname).toBe('/go');
    act(() => root.unmount());
    host.remove();
  });

  // Known bug (2026-10-18): written for effector, whose `watch` fires at once; fundamentool's Observable doesn't, so the
  // effect never runs. Fixed by the rebuild on the navigation core (D-022) — then this becomes a plain `it`.
  it.failing('useRouteIsFocus: runs when its page opens, cleaned up when that page starts closing', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/page', 
    });
    const events: string[] = [];
    function Page(): null {
      router.useRouteIsFocus(() => {
        events.push('focus');
        return () => events.push('blur');
      }, []);
      return null;
    }
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(React.createElement(Page)));
    expect(events).toEqual(['focus']);
    await act(async () => {
      await router.backLocation();
    });
    expect(events).toEqual(['focus', 'blur']);
    act(() => root.unmount());
  });

  it('hashRouterProvider: the hash part is the location', async () => {
    const {
      router, win, 
    } = setup('http://localhost/app#/home', 'hash');
    expect(router.$path.getState()).toBe('/home');
    await router.pushLocation({
      path: '/level/2', 
    });
    expect(win.location.hash).toBe('#/level/2');
    expect(win.location.pathname).toBe('/app');
    expect(router.$path.getState()).toBe('/level/2');
    expect(router.getCurrentLocation()).toMatchObject({
      path: '/level/2', 
    });
  });
});
