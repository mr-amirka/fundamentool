/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The navigator beyond its stack: its options, the host's options, links, and a reload — the stack restored from the
 * history, the pages below the top dormant, windows passed (fundamentool D-038, D-039).
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createNavigator,
  NAVIGATION_HOST_OPTION_KEYS,
  NAVIGATOR_DEPS_KEYS,
  OPEN_OPTION_KEYS,
} from '../../src/router';
import type {
  TNavigationHostOptions,
  TNavigatorDeps,
  TOpenOptions,
} from '../../src/router';
import {
  freshDeps,
  inMemory,
  mount,
  settle,
  setup,
  waitFor,
} from './_harness';

function Home() {
  return React.createElement(
    'p', null, 'home',
  );
}


describe('createNavigator — options', () => {
  it('the key lists match their types', () => {
    const deps: Required<TNavigatorDeps> = {
      ...freshDeps().deps,
      keep: 1,
      exitMs: 1,
      fallback: {},
      useState: React.useState, // a member of the view library the navigator accepts but doesn't need
    };
    expect([...NAVIGATOR_DEPS_KEYS].sort()).toEqual(Object.keys(deps).sort());
    const open: Required<TOpenOptions> = {
      reopen: true,
    };
    expect([...OPEN_OPTION_KEYS]).toEqual(Object.keys(open));
    const host: Required<TNavigationHostOptions> = {
      routes: [],
      render: () => null,
      renderWindow: () => null,
    };
    expect([...NAVIGATION_HOST_OPTION_KEYS]).toEqual(Object.keys(host));
  });

  it('checks its dependencies', () => {
    const fresh = () => ({
      ...freshDeps().deps,
    });
    expect(() => createNavigator(null as never)).toThrow(/createNavigator: expects an options object, got null/);
    expect(() => createNavigator({
      ...fresh(),
      kep: 1,
    } as never)).toThrow(/Did you mean "keep"/);
    expect(() => createNavigator({
      ...fresh(),
      router: {},
    } as never)).toThrow(/"router" expects a router/);
    expect(() => createNavigator({
      ...fresh(),
      useSyncExternalStore: undefined,
    } as never)).toThrow(/"useSyncExternalStore" expects the view library's function \(React's, Preact's\), got undefined/);
    expect(() => createNavigator({
      ...fresh(),
      createApi: 1,
    } as never)).toThrow(/"createApi" expects a function, got number 1/);
    expect(() => createNavigator({
      ...fresh(),
      keep: -1,
    })).toThrow(/"keep" expects a number ≥ 0, got number -1/);
    expect(() => createNavigator({
      ...fresh(),
      Component: class {},
    } as never)).toThrow(/unknown option "Component"/); // the view library's `Component` isn't needed
  });

  it('open checks its options', async () => {
    const {
      nav,
    } = inMemory();
    await expect(nav.open(
      'W', undefined, null as never,
    )).rejects.toThrow(/open: expects an options object, got null/);
    await expect(nav.open(
      'W', undefined, {
        reopn: false,
      } as never,
    )).rejects.toThrow(/Did you mean "reopen"/);
  });

  it('the host checks its options', () => {
    const {
      nav,
    } = inMemory();
    expect(() => nav.NavigationHostProvider(null as never)).toThrow(/NavigationHostProvider: expects an options object, got null/);
    expect(() => nav.NavigationHostProvider({
      route: [],
    } as never)).toThrow(/Did you mean "routes"/);
    expect(() => nav.NavigationHostProvider({
      routes: {},
    } as never)).toThrow(/"routes" expects the route table/);
    expect(() => nav.NavigationHostProvider({
      routes: ['/'],
    } as never)).toThrow(/a row of "routes" expects \[pattern, \{ … \}\]/);
    expect(() => nav.NavigationHostProvider({
      routes: [
        [
          '/',
          {},
        ],
      ],
    })).toThrow(/the row "\/" has no "main"/);
    expect(() => nav.NavigationHostProvider({
      routes: [],
      render: 1,
    } as never)).toThrow(/"render" expects a function, got number 1/);
  });
});

describe('createNavigator — the host', () => {
  it('draws a row\'s main with its route (params decoded); a path no row fits draws nothing', async () => {
    const {
      nav, router,
    } = inMemory('/#/level/L%2F1');
    const Level = ({
      route,
    }: { route: { params: { id: string } } }) => React.createElement(
      'p', null, `level ${route.params.id}`,
    );
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/level/:id',
          {
            main: Level,
          },
        ],
      ],
    });
    const {
      container, unmount,
    } = mount(view);
    expect(container.textContent).toBe('level L/1');
    await act(() => router.pushLocation({
      path: '/nowhere',
    }).then(() => undefined));
    expect(container.textContent).toBe('');
    unmount();
  });

  it('a new host gives a new table (a hot reload of the module that makes it)', async () => {
    const {
      nav,
    } = inMemory('/#/x');
    const Text = (text: string) => () => React.createElement(
      'p', null, text,
    );
    nav.NavigationHostProvider({
      routes: [
        [
          '/x',
          {
            main: Text('old'),
          },
        ],
      ],
    });
    const next = nav.NavigationHostProvider({
      routes: [
        [
          '/x',
          {
            main: Text('new'),
          },
        ],
      ],
    });
    const {
      container, unmount,
    } = mount(next);
    expect(container.textContent).toBe('new');
    unmount();
  });

  it('entries get their rows when the host is made; a page opened before it has none', async () => {
    const {
      nav, router,
    } = inMemory();
    await router.pushLocation({
      path: '/x',
    });
    expect(nav.getState().page.row).toBeNull();
    nav.NavigationHostProvider({
      routes: [
        [
          '/(.*)',
          {
            main: Home,
            keep: true,
          },
        ],
      ],
    });
    expect(nav.getState().entries.map((entry) => entry.kind === 'page' && entry.row?.keep)).toEqual([
      true,
      true,
    ]);
  });

  it('Link: its href is what the part shows; a click steps there (false from onClick cancels); NavLink marks the shown one', async () => {
    const {
      nav, router,
    } = inMemory('/#/a');
    const clicked: string[] = [];
    const view = () => React.createElement(
      'nav', null,
      React.createElement(
        nav.Link as unknown as string, {
          href: '/b?x=1',
          'data-link': 'b',
        }, 'b',
      ),
      React.createElement(
        nav.Link as unknown as string, {
          href: {
            path: '/c',
          },
          component: 'button',
          onClick: () => {
            clicked.push('c');
            return false;
          },
        }, 'c',
      ),
      React.createElement(
        nav.NavLink as unknown as string, {
          href: '/a',
          'data-nav': 'a',
        }, 'a',
      ),
      React.createElement(
        nav.NavLink as unknown as string, {
          href: '/b',
          activeAsParent: true,
          className: 'tab',
          'data-nav': 'b',
        }, 'b',
      ),
      React.createElement(
        nav.NavLink as unknown as string, {
          href: '/',
          activeAsParent: true,
          'data-nav': 'root',
        }, 'root',
      ),
      React.createElement(
        nav.NavLink as unknown as string, {
          href: '?x=1',
          'data-nav': 'query',
        }, 'query',
      ),
    );
    const {
      container, unmount,
    } = mount(view);
    const link = container.querySelector('[data-link="b"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/b?x=1');
    expect(container.querySelector('[data-nav="a"]')?.className).toBe('active');
    expect(container.querySelector('[data-nav="b"]')?.className).toBe('tab');
    expect(container.querySelector('[data-nav="root"]')?.className).toBe('active'); // every page is under `/`
    expect(container.querySelector('[data-nav="query"]')?.className).toBe('active'); // `?x=1` — the current path, as <a href> reads it
    await act(async () => {
      link.click();
      await waitFor(() => expect(router.$path.getState()).toBe('/b'));
    });
    expect(container.querySelector('[data-nav="b"]')?.className).toBe('active tab');
    await act(async () => {
      (container.querySelector('button') as HTMLButtonElement).click();
      await settle(10);
    });
    expect(clicked).toEqual(['c']);
    expect(router.$path.getState()).toBe('/b');
    await act(() => router.pushLocation({
      path: '/b/inner',
    }).then(() => undefined));
    expect(container.querySelector('[data-nav="b"]')?.className).toBe('active tab');
    expect(nav.getState().entries).toHaveLength(3);
    unmount();
  });
});

describe('createNavigator — tabs and hooks', () => {
  it('leaving a tab\'s root asks the guards of the windows over it; agreed — it stops at the root (the tab keeps it)', async () => {
    const {
      nav, navigator, paths,
    } = setup({}, '/a');
    await nav.switchSection('b');
    void nav.open('Form');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b',
      'window',
    ]));
    let allow = false;
    nav.onBeforeLeave(nav.getState().entries[2].id, () => allow);
    await navigator.leavePage();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b',
      'window',
    ]));
    allow = true;
    await navigator.leavePage();
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b',
    ]));
    expect(nav.getState().section).toBe('/b');
  });

  it('a hook outside the host belongs to the top entry', () => {
    const {
      nav,
    } = inMemory();
    const log: string[] = [];
    const Outside = () => {
      nav.useWhileOpen(() => {
        log.push('open');
      });
      return null;
    };
    const {
      unmount,
    } = mount(Outside);
    expect(log).toEqual(['open']);
    unmount();
  });
});

describe('createNavigator — a reload (D-039)', () => {
  it('the stack comes back from the history; the pages below the top are dormant until reached', async () => {
    const before = setup({}, '/a');
    await before.nav.go('/a/list');
    await before.nav.go('/a/1');
    const after = before.browser.reload();
    expect(after.paths()).toEqual([
      '/a',
      '/a/list',
      '/a/1',
    ]);
    expect(after.nav.getState().entries.map((entry) => entry.kind === 'page' && entry.dormant)).toEqual([
      true,
      true,
      false,
    ]);
    expect(after.nav.getState().layers.map((entry) => entry.location.path)).toEqual(['/a/1']);
    await after.nav.back();
    expect(after.paths()).toEqual([
      '/a',
      '/a/list',
    ]);
    expect(after.nav.getState().page.dormant).toBe(false);
    expect(after.nav.getState().layers.map((entry) => entry.location.path)).toEqual(['/a/list']);
  });

  it('a window open at the reload is gone: its entry is passed; Back passes the entries of gone windows', async () => {
    const before = setup({}, '/a');
    await before.nav.go('/a/1');
    void before.nav.open('Menu');
    await waitFor(() => expect(before.paths()).toEqual([
      '/a',
      '/a/1',
      'window',
    ]));
    const reloaded = before.browser.reload();
    await waitFor(() => expect(reloaded.paths()).toEqual([
      '/a',
      '/a/1',
    ]));
    expect(reloaded.browser.index()).toBe(1);

    // A window under the page shown: Back from the page passes it to the page below.
    const second = setup({}, '/a');
    void second.nav.open('Menu');
    await waitFor(() => expect(second.paths()).toEqual([
      '/a',
      'window',
    ]));
    await second.nav.go('/a/2');
    const again = second.browser.reload();
    expect(again.paths()).toEqual([
      '/a',
      'window',
      '/a/2',
    ]);
    await again.nav.back();
    await waitFor(() => expect(again.paths()).toEqual(['/a']));
    expect(again.browser.index()).toBe(0);
  });

  it('tabs come back with their stacks', async () => {
    const before = setup({}, '/a');
    await before.nav.go('/a/1');
    await before.nav.switchSection('b');
    await before.nav.go('/b/2');
    const after = before.browser.reload();
    expect(after.paths()).toEqual([
      '/a',
      '/b',
      '/b/2',
    ]);
    expect(after.nav.getState().section).toBe('/b');
    await after.nav.switchSection('a');
    expect(after.paths()).toEqual([
      '/a',
      '/a/1',
    ]);
  });

  it('Forward after a reload onto pages the new navigator doesn\'t hold: the stack the history kept', async () => {
    const before = setup({}, '/a');
    await before.nav.go('/a/1');
    await before.nav.go('/a/2');
    await before.nav.back();
    const after = await before.browser.reloadKeepingAhead();
    expect(after.paths()).toEqual([
      '/a',
      '/a/1',
    ]);
    after.browser.userForward();
    await waitFor(() => expect(after.paths()).toEqual([
      '/a',
      '/a/1',
      '/a/2',
    ]));
  });

  it('an entry of another stack (the one before a start over by another script) rebuilds the stack from it', async () => {
    const {
      nav, browser, paths,
    } = setup({}, '/a');
    await nav.go('/a/1');
    browser.foreign('/b/old');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/b/old',
    ]));
    browser.userBack(); // the new stack's start (written over the other script's entry)
    await waitFor(() => expect(paths()).toEqual(['/a']));
    browser.userBack(); // an entry of the stack from before: rebuilt from it
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      '/a/1',
    ]));
    expect(browser.index()).toBe(1);
  });

  it('an entry of a stack we don\'t hold at a depth we have: the stack the history kept', async () => {
    const {
      nav, browser, paths, win,
    } = setup(
      {}, '/a', undefined,
    );
    const menu = nav.open('Menu');
    await waitFor(() => expect(paths()).toEqual([
      '/a',
      'window',
    ]));
    const state = {
      fundamentool: 2,
      index: 0,
      state: '/',
      rev: {
        url: 'written before a reload',
      },
      data: {
        url: {
          nav: 2,
          id: 999,
          depth: 0,
          stack: [
            [
              'page',
              999,
              '/b/x',
              '/b',
              0, // its place in the history
            ],
          ],
          shown: '/b',
          tabs: {},
        },
      },
    };
    win.history.pushState(
      state, '', '/b/x',
    );
    win.dispatchEvent(new (win as unknown as { PopStateEvent: typeof PopStateEvent }).PopStateEvent('popstate', {
      state,
    }));
    await waitFor(() => expect(paths()).toEqual(['/b/x']));
    expect(browser.path()).toBe('/b/x');
    await expect(menu).resolves.toBeNull(); // the window of the stack dropped
  });

  it('a back queued behind a start over: by its turn there is nothing to go back to', async () => {
    const {
      nav, router, paths,
    } = setup({}, '/a');
    await nav.go('/a/1');
    void nav.startOver('/a');
    await expect(router.backLocation()).resolves.toBe(false);
    expect(paths()).toEqual(['/a']);
  });

  it('a move to an entry of a stack we don\'t hold rebuilds the stack from it', async () => {
    const before = setup({}, '/a');
    await before.nav.go('/a/1');
    await before.nav.go('/a/2');
    await before.nav.back();
    // Reloaded at `/a/1`: the history still holds `/a/2` ahead, the new navigator doesn't.
    const after = before.browser.reload();
    after.browser.userBack();
    await waitFor(() => expect(after.paths()).toEqual(['/a']));
  });
});
