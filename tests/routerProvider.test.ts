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
  ROUTER_DEPS_KEYS,
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

  // Was broken before the rebuild on the navigation core (D-022): written for effector, whose `watch` fires at once.
  it('useRouteIsFocus: runs when its page opens, cleaned up when that page starts closing', async () => {
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

describe('routerProvider — on the navigation core (D-022)', () => {
  it('open: a window is a history entry over the page — back closes it, the page stays; the result resolves', async () => {
    const {
      router, win, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/a', 
    });
    const result = router.open<string>('Confirm', {
      text: 'sure?', 
    });
    await waitFor(() => expect(router.$historyDepth.getState()).toBe(2));
    // The window's entry keeps the page's address; the location is still the page.
    expect(win.location.pathname).toBe('/a');
    expect(router.$path.getState()).toBe('/a');
    expect(router.getPrevLocation()).toMatchObject({
      path: '/a', 
    });
    await expect(router.backLocation()).resolves.toEqual({
      locked: false, 
    });
    await expect(result).resolves.toBeNull();
    expect(router.$path.getState()).toBe('/a');
    expect(router.$historyDepth.getState()).toBe(1);

    const answer = router.open<string>('Confirm');
    await waitFor(() => expect(router.$historyDepth.getState()).toBe(2));
    const top = router.navigation.getState().entries[2];
    await router.close(top.id, 'yes');
    await expect(answer).resolves.toBe('yes');
  });

  it('getNextLocation: the entry just left; a push forgets it', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/a', 
    });
    await router.backLocation();
    expect(router.getNextLocation()).toMatchObject({
      path: '/a', 
    });
    await router.pushLocation({
      path: '/b', 
    });
    expect(router.getNextLocation()).toBeUndefined();
  });

  it('isTryClosingLocation: true while the entry\'s watchers are asked', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/form', 
    });
    let answer: (value: boolean) => void = () => undefined;
    router.onBeforeUnload(() => new Promise<boolean>((resolve) => {
      answer = resolve;
    }));
    expect(router.isTryClosingCurrentLocation()).toBe(false);
    const back = router.backLocation();
    await waitFor(() => expect(router.isTryClosingLocation(1)).toBe(true));
    answer(false);
    await expect(back).resolves.toEqual({
      locked: true, 
    });
    expect(router.isTryClosingLocation(1)).toBe(false);
    expect(router.isTryClosingLocation(9)).toBe(false);
    expect(router.isWaitingUnloadLocation(9)).toBe(false);
  });

  it('a forwards watcher is asked before a page or a window opens over its page; false keeps it', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    let allow = false;
    const asked: string[] = [];
    router.onBeforeUnload((loc) => {
      asked.push(loc.path);
      return allow;
    }, {
      forwards: true,
      backwards: false, 
    });
    await expect(router.pushLocation({
      path: '/a', 
    })).resolves.toMatchObject({
      path: '/', 
    });
    expect(router.$path.getState()).toBe('/');
    await expect(router.open('W')).resolves.toBeNull();
    expect(asked).toEqual(['/', '/']);
    allow = true;
    await router.pushLocation({
      path: '/a', 
    });
    expect(router.$path.getState()).toBe('/a');
  });

  it('a push watcher may be an object with options; the unsubscribe runs once', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/edit', 
    }, {
      onBeforeUnload: {
        callback: () => false,
        backwards: true, 
      }, 
    });
    expect(router.isWaitingUnloadCurrentLocation()).toBe(true);
    await expect(router.backLocation()).resolves.toEqual({
      locked: true, 
    });
    const stop = router.onBeforeUnload(() => true);
    stop();
    stop();
    expect(router.isWaitingUnloadCurrentLocation()).toBe(true);
  });

  it('a quiet back moves the state, not the transition state; backToDepth quiet — neither at the end', async () => {
    const {
      router, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/a', 
    });
    await router.pushLocation({
      path: '/b', 
    });
    await router.backLocation({
      quiet: true, 
    });
    expect(router.$immeidatePath.getState()).toBe('/a');
    expect(router.$path.getState()).toBe('/b');
    await router.backToDepth(0, {
      quiet: true, 
    });
    expect(router.$immeidatePath.getState()).toBe('/');
    expect(router.$path.getState()).toBe('/b');
    await expect(router.backToDepth(0)).resolves.toEqual({
      locked: true, 
    });
  });

  it('startOverLocation: the history starts again from the address', async () => {
    const {
      router, win, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/a', 
    });
    await router.pushLocation({
      path: '/b', 
    });
    await router.startOverLocation({
      path: '/home', 
    });
    expect(win.location.pathname).toBe('/home');
    expect(router.$historyDepth.getState()).toBe(0);
    expect(router.getHistory().map((loc) => loc.path)).toEqual(['/home']);
  });

  it('hashRouterProvider: describe gets the hash part; sections are hash paths; start over and open work on it', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/app#/', 
    });
    const seen: string[] = [];
    const router = hashRouterProvider({
      window: dom.window as unknown as Window,
      Component: React.Component,
      useEffect: React.useEffect,
      createElement: React.createElement,
      forwardRef: React.forwardRef,
      createObservable,
      createApi,
      describe: (loc) => {
        seen.push(loc.path);
        return {
          keep: loc.path === '/', 
        };
      },
      sections: {
        home: '/',
        top: '/top', 
      },
    } as never);
    expect(seen).toContain('/');
    await router.pushLocation({
      path: '/level/1', 
    });
    expect(seen).toContain('/level/1');
    expect(router.navigation.getState().layers.map((entry) => entry.depth)).toEqual([0, 1]);
    await router.switchSection('top');
    expect(dom.window.location.hash).toBe('#/top');
    expect(dom.window.location.pathname).toBe('/app');
    expect(router.$path.getState()).toBe('/top');
    await router.backToSection();
    await router.startOverLocation({
      path: '/', 
    });
    expect(router.$path.getState()).toBe('/');
    expect(dom.window.location.hash).toBe('#/');
  });

  it('view: the host renders the pages with their locations and the windows', async () => {
    const {
      router, 
    } = setup('http://localhost/#/');
    const view = router.view(React as never, {
      renderPage: (entry, location) => React.createElement(
        'p', {
          'data-depth': entry.depth, 
        }, `page ${location.path}`,
      ),
      renderWindow: (entry, props) => React.createElement(
        'dialog', {
          open: props.open, 
        }, String(entry.window),
      ),
    });
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(React.createElement(view.NavigationHost as () => null)));
    expect(host.textContent).toContain('page /');
    await act(async () => {
      await router.pushLocation({
        path: '/a', 
      });
      void router.open('Hello');
      await settle();
    });
    expect(host.textContent).toContain('page /a');
    expect(host.querySelector('dialog')?.textContent).toBe('Hello');
    act(() => root.unmount());
  });

  it('checks its dependencies: an unknown key — "did you mean"; a wrong value — expected / got', () => {
    const dom = new JSDOM('', {
      url: 'http://localhost/', 
    });
    const deps = {
      window: dom.window,
      Component: React.Component,
      useEffect: React.useEffect,
      createElement: React.createElement,
      forwardRef: React.forwardRef,
      createObservable,
      createApi,
    };
    expect(() => routerProvider({
      ...deps,
      describ: () => ({}), 
    } as never)).toThrow(/unknown option "describ". Did you mean "describe"/);
    expect(() => routerProvider(null as never)).toThrow(/expects a dependencies object, got null/);
    expect(() => routerProvider({
      ...deps,
      window: {}, 
    } as never)).toThrow(/"window" expects a browser window/);
    expect(() => routerProvider({
      ...deps,
      createApi: 1, 
    } as never)).toThrow(/"createApi" expects a function, got number 1/);
    expect(() => routerProvider({
      ...deps,
      describe: 'x', 
    } as never)).toThrow(/"describe" expects a function/);
  });

  it('a window finishing its exit does not touch the state; many addresses do not grow the cache without bound', async () => {
    const dom = new JSDOM('', {
      url: 'http://localhost/', 
    });
    const router = routerProvider({
      window: dom.window,
      Component: React.Component,
      useEffect: React.useEffect,
      createElement: React.createElement,
      forwardRef: React.forwardRef,
      createObservable,
      createApi,
      exitMs: 0,
      keep: 2,
      sectionHistory: 'shared',
    } as never);
    void router.open('W');
    await waitFor(() => expect(router.$historyDepth.getState()).toBe(1));
    let changes = 0;
    router.$state.watch(() => {
      changes++;
    });
    await router.backLocation();
    await settle(20);
    expect(changes).toBe(1);
    for (let i = 0; i < 300; i++) {
      await router.replaceParam({
        i, 
      });
    }
    expect(router.$query.getState()).toEqual({
      i: 299, 
    });
  });

  it('the hash router\'s getters and the throttled helpers', async () => {
    const {
      router, 
    } = setup('http://localhost/app#/a', 'hash');
    const first = router.pushLocationThrottled({
      path: '/b', 
    });
    // Within 300 ms of the first: ignored.
    await router.pushLocationThrottled({
      path: '/ignored', 
    });
    await first;
    expect(router.getPrevLocation()).toMatchObject({
      path: '/a', 
    });
    expect(router.getFromLocation()).toMatchObject({
      path: '/a', 
    });
    await router.replaceLocationThrottled({
      path: '/c', 
    });
    await router.pushParam({
      p: '1', 
    });
    await router.replaceParam({
      p: '2', 
    });
    expect(router.$query.getState()).toEqual({
      p: '2', 
    });
    await router.backLocationThrottled();
    expect(router.getNextLocation()).toMatchObject({
      path: '/c', 
    });
    expect(router.$path.getState()).toBe('/c');
    router.paramStorage.set('k', 'v');
    router.paramReplaceStorage.set('k', 'w');
    await settle();
    expect(router.$query.getState()).toEqual({
      k: 'w', 
    });
  });

  it('the browser\'s Forward returns to the page left by back; a forwards watcher is asked first (D-024)', async () => {
    const {
      router, win, 
    } = setup('http://localhost/');
    await router.pushLocation({
      path: '/a', 
    });
    await router.backLocation();
    expect(router.getNextLocation()).toMatchObject({
      path: '/a', 
    });
    let allow = false;
    router.onBeforeUnload(() => allow, {
      forwards: true,
      backwards: false, 
    });
    win.history.forward();
    await settle();
    expect(router.$path.getState()).toBe('/');
    allow = true;
    win.history.forward();
    await waitFor(() => expect(router.$path.getState()).toBe('/a'));
    expect(win.location.pathname).toBe('/a');
    expect(router.$historyDepth.getState()).toBe(1);
  });

  it('open(…, { reopen: false }): Forward doesn\'t bring the window back', async () => {
    const {
      router, win, 
    } = setup('http://localhost/');
    void router.open('Confirm', null, {
      reopen: false, 
    });
    await waitFor(() => expect(router.$historyDepth.getState()).toBe(1));
    await router.backLocation();
    expect(router.getNextLocation()).toBeUndefined();
    win.history.forward();
    await settle();
    expect(router.$historyDepth.getState()).toBe(0);
    void router.open('Menu');
    await waitFor(() => expect(router.$historyDepth.getState()).toBe(1));
    await router.backLocation();
    // A window ahead: the next location is the page it opens over.
    expect(router.getNextLocation()).toMatchObject({
      path: '/', 
    });
  });

  it('ROUTER_DEPS_KEYS lists every key of the dependencies type', () => {
    type TKeys = keyof import('../src/routerProvider').TRouterProviderDeps;
    const keys: readonly TKeys[] = ROUTER_DEPS_KEYS;
    const all: Record<TKeys, true> = {
      window: true,
      Component: true,
      useEffect: true,
      createElement: true,
      forwardRef: true,
      createObservable: true,
      createApi: true,
      describe: true,
      sections: true,
      sectionHistory: true,
      keep: true,
      exitMs: true,
    };
    expect([...keys].sort()).toEqual(Object.keys(all).sort());
  });
});
