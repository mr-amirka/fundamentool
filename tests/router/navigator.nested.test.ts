/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * C8 (fundamentool D-049): a second router on an inner part (the entry's own state) makes history entries the
 * navigator doesn't know; the navigator moves to its own entries by their places in the history, not by counting.
 */
import {
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  createRouter,
} from '../../src/router';
import {
  inMemory,
  waitFor,
} from './_harness';

/** A navigator on the hash, its host's table, and a router on the entry's own state (a page's inner steps). */
function nested(start: string, routes: Parameters<ReturnType<typeof inMemory>['nav']['NavigationHostProvider']>[0]['routes']) {
  const made = inMemory(start);
  made.nav.NavigationHostProvider({
    routes,
  });
  const inner = createRouter({
    historyPrimitive: made.history.state,
    createObservable,
    createApi,
  });
  return {
    ...made,
    inner,
  };
}

const PLAIN_ROUTES = [
  [
    '/home',
    {
      main: 'home',
    },
  ],
  [
    '/catalog',
    {
      main: 'catalog',
    },
  ],
] as const;

describe('a router on an inner part under a navigator (C8)', () => {
  it('the inner steps are history entries the navigator skips over: Back to home takes one move', async () => {
    const {
      nav, router, inner, history,
    } = nested('/#/home', PLAIN_ROUTES as never);
    await router.pushLocation({
      path: '/catalog',
    });
    // The catalog's filter panel keeps its steps in the entry's own state
    await inner.pushLocation({
      path: '/filter/1',
    });
    await inner.pushLocation({
      path: '/filter/2',
    });
    expect(history.entries()).toHaveLength(4);
    expect(nav.getHistory()).toHaveLength(2);
    // The player's Back undoes an inner step — the navigator's part didn't change: the catalog stays
    history.navigate(-1);
    await waitFor(() => expect(inner.$path.getState()).toBe('/filter/1'));
    expect(nav.getState().page.location.path).toBe('/catalog');
    // The app's "Home": one move to home's place — not one step back (which would land on the catalog again)
    await expect(nav.backToDepth(0)).resolves.toBe(true);
    expect(history.index()).toBe(0);
    expect(nav.getState().page.location.path).toBe('/home');
  });

  it('a page opened above the inner steps: closing it and going home land on the navigator\'s own entries', async () => {
    const {
      nav, router, inner, history,
    } = nested('/#/home', PLAIN_ROUTES as never);
    await router.pushLocation({
      path: '/catalog',
    });
    await inner.pushLocation({
      path: '/filter/1',
    });
    void nav.open('Window');
    await waitFor(() => expect(nav.getHistory()).toHaveLength(3));
    const windowId = nav.getHistory()[2].id;
    await nav.close(windowId);
    expect(history.index()).toBe(2); // back on the catalog's inner step, where the window was opened from
    expect(nav.getHistory()).toHaveLength(2);
    await expect(router.backLocation()).resolves.toBe(true);
    expect(history.index()).toBe(0);
    expect(nav.getState().page.location.path).toBe('/home');
  });

  it('a guard that refuses brings the player back exactly where they were — on the page\'s inner step', async () => {
    const {
      nav, router, inner, history,
    } = nested('/#/home', PLAIN_ROUTES as never);
    await router.pushLocation({
      path: '/catalog',
    });
    nav.onBeforeLeave(nav.getState().page.id, () => false); // "discard changes?" — no
    await inner.pushLocation({
      path: '/filter/1',
    });
    expect(history.index()).toBe(2);
    await expect(router.backLocation()).resolves.toBe(false);
    expect(history.index()).toBe(2); // the inner step, not the catalog's first place
    expect(inner.$path.getState()).toBe('/filter/1');
    expect(nav.getState().page.location.path).toBe('/catalog');
  });

  it('a section switch with inner steps in the shown section lays the other section out from the right place', async () => {
    const {
      nav, router, inner, history,
    } = nested('/#/a', [
      [
        '/a',
        {
          main: 'a',
          section: true,
        },
      ],
      [
        '/b',
        {
          main: 'b',
          section: true,
        },
      ],
      [
        '/(.*)',
        {
          main: 'page',
        },
      ],
    ] as never);
    await router.pushLocation({
      path: '/a/x',
    });
    await inner.pushLocation({
      path: '/step/1',
    });
    await router.pushLocation({
      path: '/b',
    });
    expect(nav.getState().section).toBe('/b');
    expect(history.entries()).toEqual([
      '/#/a',
      '/#/b',
    ]);
    expect(nav.getHistory().map((entry) => entry.historyIndex)).toEqual([
      0,
      1,
    ]);
  });
});
