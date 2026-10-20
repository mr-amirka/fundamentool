/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * A page that stays through its own steps, `quietQuery`, quiet steps, sections by links, `href` (fundamentool D-042,
 * D-043).
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act,
} from 'react';
import {
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  BACK_OPTION_KEYS,
  createRouter,
  memoryHistoryPrimitivesProvider,
  PARAMS_OPTION_KEYS,
  STEP_OPTION_KEYS,
} from '../../src/router';
import type {
  TBackOptions,
  TPageRoute,
  TParamsOptions,
  TRouter,
  TStepOptions,
} from '../../src/router';
import {
  resolveHref,
} from '../../src/router/location';
import {
  fixedPathOf,
  isFixedPattern,
} from '../../src/router/routeTable';
import {
  urlParse,
} from '../../src/urlParse';
import {
  inMemory,
  mount,
  setup,
  waitFor,
} from './_harness';

const h = React.createElement;

function Plain(): React.ReactElement {
  return h(
    'p', null, 'page',
  );
}

describe('the same page (D-043)', () => {
  it('a step of the shown page\'s row is a new history entry of the same page: mounted once, its route follows', async () => {
    const {
      nav, router, history,
    } = inMemory('/#/catalog');
    const mounts: string[] = [];
    const renders: string[] = [];
    function Catalog(props: { route: TPageRoute }): React.ReactElement {
      React.useEffect(() => {
        mounts.push('mount');
      }, []);
      renders.push(String(props.route.location.query?.sort ?? '-'));
      return h(
        'p', null, 'catalog',
      );
    }
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/catalog',
          {
            main: Catalog,
          },
        ],
      ],
    });
    const {
      unmount,
    } = mount(view);
    const id = nav.getState().page.id;
    await act(async () => {
      router.params.set('sort', 'price');
      await waitFor(() => expect(nav.getState().entries).toHaveLength(2));
    });
    expect(history.entries()).toEqual([
      '/#/catalog',
      '/#/catalog?sort=price',
    ]);
    expect(nav.getState().page.id).toBe(id);
    await act(() => router.backLocation().then(() => undefined));
    expect(renders).toEqual([
      '-',
      'price',
      '-',
    ]);
    expect(mounts).toEqual(['mount']);
    unmount();
  });

  it('its own steps ask neither its leave guards nor its forward handlers; leaving it and covering it do', async () => {
    const {
      nav, router,
    } = inMemory('/#/home');
    nav.NavigationHostProvider({
      routes: [
        [
          '/home',
          {
            main: Plain,
          },
        ],
        [
          '/catalog',
          {
            main: Plain,
          },
        ],
        [
          '/other',
          {
            main: Plain,
          },
        ],
      ],
    });
    await router.pushLocation({
      path: '/catalog',
    });
    const id = nav.getState().page.id;
    const asked: string[] = [];
    nav.onBeforeLeave(id, () => {
      asked.push('leave');
      return true;
    });
    nav.onForward(id, () => {
      asked.push('forward');
    });
    await router.pushLocation({
      path: '/catalog',
      query: {
        p: 2,
      },
    });
    await router.backLocation();
    expect(asked).toEqual([]);
    await router.pushLocation({
      path: '/other',
    });
    await router.backLocation();
    await router.backLocation();
    expect(asked).toEqual([
      'forward',
      'leave',
    ]);
    expect(nav.getState().page.location.path).toBe('/home');
  });

  it('a page left with several of its entries is asked once', async () => {
    const {
      nav, paths,
    } = setup();
    await nav.go('/a/form');
    await nav.go('/a/form?step=2'); // the same page
    let asked = 0;
    nav.onBeforeLeave(nav.getState().page.id, () => {
      asked++;
      return true;
    });
    await expect(nav.backToRoot()).resolves.toBe(true);
    expect(asked).toBe(1);
    expect(paths()).toEqual(['/a']);
  });

  it('quietQuery: a step that changes only the query doesn\'t re-render the page; its parts follow router.params', async () => {
    const {
      nav, router,
    } = inMemory('/#/map/base');
    const renders: string[] = [];
    function Zoom(): React.ReactElement {
      const [
        zoom,
        setZoom,
      ] = React.useState(router.params.get('zoom'));
      React.useEffect(() => router.params.watch((change) => {
        change.key === 'zoom' && setZoom(change.value);
      }), []);
      return h(
        'b', null, `zoom ${String(zoom)}`,
      );
    }
    function MapPage(props: { route: TPageRoute }): React.ReactElement {
      renders.push(props.route.location.path as string);
      return h(
        'div', null, h(Zoom),
      );
    }
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/map/:layer',
          {
            main: MapPage,
            quietQuery: true,
          },
        ],
      ],
    });
    const {
      container, unmount,
    } = mount(view);
    await act(async () => {
      router.params.set(
        'zoom', 3, {
          replace: true,
        },
      );
      await waitFor(() => expect(router.$query.getState()).toEqual({
        zoom: 3,
      }));
    });
    expect(container.textContent).toBe('zoom 3');
    expect(renders).toEqual(['/map/base']);
    await act(() => router.pushLocation({
      path: '/map/sat',
    }).then(() => undefined));
    expect(renders).toEqual([
      '/map/base',
      '/map/sat',
    ]);
    unmount();
  });
});

describe('quiet steps (D-042)', () => {
  it('the option key lists match their types', () => {
    const step: Required<TStepOptions> = {
      quiet: true,
    };
    const back: Required<TBackOptions> = {
      force: true,
      quiet: true,
    };
    const params: Required<TParamsOptions> = {
      replace: true,
      quiet: true,
    };
    expect([...STEP_OPTION_KEYS].sort()).toEqual(Object.keys(step).sort());
    expect([...BACK_OPTION_KEYS].sort()).toEqual(Object.keys(back).sort());
    expect([...PARAMS_OPTION_KEYS].sort()).toEqual(Object.keys(params).sort());
  });

  /** A navigator over home and a wizard, its host made. */
  function wizard(start = '/#/home') {
    const made = inMemory(start);
    made.nav.NavigationHostProvider({
      routes: [
        [
          '/home',
          {
            main: Plain,
          },
        ],
        [
          '/wizard/:step',
          {
            main: Plain,
          },
        ],
        [
          '/deep',
          {
            main: Plain,
          },
        ],
      ],
    });
    return made;
  }

  it('a quiet step changes the history and the stack and shows nothing until a step that isn\'t quiet', async () => {
    const {
      nav, router, history,
    } = wizard();
    const before = nav.getState();
    for (let step = 1; step < 3; step++) {
      await router.pushLocation({
        path: `/wizard/${step}`,
      }, {
        quiet: true,
      });
    }
    expect(nav.getState()).toBe(before);
    expect(router.$path.getState()).toBe('/home');
    expect(history.entries()).toEqual([
      '/#/home',
      '/#/wizard/1',
      '/#/wizard/2',
    ]);
    await router.pushLocation({
      path: '/wizard/3',
    });
    expect(nav.getState().entries.map((entry) => entry.kind === 'page' && entry.location.path)).toEqual([
      '/home',
      '/wizard/1',
      '/wizard/2',
      '/wizard/3',
    ]);
    expect(router.$path.getState()).toBe('/wizard/3');
    await router.backLocation({
      quiet: true,
    });
    expect(router.$path.getState()).toBe('/wizard/3');
    await expect(nav.backToRoot()).resolves.toBe(true);
    expect(nav.getState().entries).toHaveLength(1);
    expect(router.$path.getState()).toBe('/home');
  });

  it('a home page put under a deep link quietly isn\'t mounted until reached', async () => {
    const {
      nav, router,
    } = wizard('/#/deep');
    await router.replaceLocation({
      path: '/home',
    }, {
      quiet: true,
    });
    await router.pushLocation({
      path: '/deep',
    });
    const state = nav.getState();
    expect(state.entries.map((entry) => entry.kind === 'page' && entry.location.path)).toEqual([
      '/home',
      '/deep',
    ]);
    expect(state.layers.map((entry) => entry.location.path)).toEqual(['/deep']);
  });

  it('the router alone: a quiet step isn\'t shown; params keep every key written, quiet or queued', async () => {
    const history = memoryHistoryPrimitivesProvider('/a');
    const router: TRouter = createRouter({
      historyPrimitive: history.url,
      createObservable,
      createApi,
    });
    await router.pushLocation({
      path: '/b',
    }, {
      quiet: true,
    });
    expect(router.$path.getState()).toBe('/a');
    router.params.set(
      'x', 1, {
        quiet: true,
      },
    );
    router.params.set(
      'y', 2, {
        quiet: true,
      },
    );
    expect(router.params.get('x')).toBe(1);
    expect(router.params.getKeys()).toEqual([
      'x',
      'y',
    ]);
    expect(router.$path.getState()).toBe('/a');
    router.params.set('z', 3); // not quiet: shown, with every key written before
    expect(router.$query.getState()).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
    expect(history.entries()).toEqual([
      '/a',
      '/b',
      '/b?x=1',
      '/b?x=1&y=2',
      '/b?x=1&y=2&z=3',
    ]);
    await router.backLocation({
      quiet: true,
    });
    expect(router.$query.getState()).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
    expect(history.index()).toBe(3);
    await expect(router.pushLocation({}, {
      quite: true,
    } as never)).rejects.toThrow(/Did you mean "quiet"/);
    expect(() => router.params.set(
      'x', 2, {
        replace: 'yes',
      } as never,
    )).toThrow(/"replace" expects true or false, got string "yes"/);
    expect(() => router.params.clear(1 as never)).toThrow(/expects an options object, got number 1/);
  });

  it('with a navigator, two params written before the steps are taken are both kept', async () => {
    const {
      router,
    } = wizard();
    router.params.set('a', 1);
    router.params.set('b', 2);
    expect(router.params.get('a')).toBe(1);
    await waitFor(() => expect(router.$query.getState()).toEqual({
      a: 1,
      b: 2,
    }));
  });
});

describe('sections by links (D-043)', () => {
  it('another section: first visit — its root at the link\'s address; later — as it was left, the link\'s address not applied', async () => {
    const {
      nav, router, paths,
    } = setup();
    await router.pushLocation({
      path: '/b',
      query: {
        filter: 'new',
      },
    });
    expect(paths()).toEqual([
      '/a',
      '/b',
    ]);
    await nav.go('/b/1');
    await nav.switchSection('a');
    await router.pushLocation({
      path: '/b',
      query: {
        filter: 'old',
      },
    });
    expect(paths()).toEqual([
      '/a',
      '/b',
      '/b/1',
    ]);
    expect(nav.getState().entries[1]).toMatchObject({
      location: {
        query: {
          filter: 'new',
        },
      },
    });
  });

  it('the host checks the rows\' flags; the start section\'s root has no parameters', () => {
    const {
      nav,
    } = inMemory();
    expect(() => nav.NavigationHostProvider({
      routes: [
        [
          '/a',
          {
            main: Plain,
            section: 'a' as never,
          },
        ],
      ],
    })).toThrow(/the row "\/a": "section" expects true or false, got string "a"/);
    expect(() => nav.NavigationHostProvider({
      routes: [
        [
          '/user/:id',
          {
            main: Plain,
            section: true,
          },
        ],
      ],
    })).toThrow(/the start section's root "\/user\/:id" is put under deep links/);
  });

  it('NavLink is active while the section it leads to is shown — on any of its pages', async () => {
    const {
      nav, router,
    } = inMemory('/#/a');
    const view = nav.NavigationHostProvider({
      routes: [
        [
          '/a',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/user/:id',
          {
            main: Plain,
            section: true,
          },
        ],
        [
          '/(.*)',
          {
            main: Plain,
          },
        ],
      ],
    });
    const Bar = () => h(
      'nav', null,
      h(
        nav.NavLink as unknown as string, {
          href: '/user/1',
          'data-nav': 'user',
        }, 'user',
      ),
      h(view as unknown as string),
    );
    const {
      container, unmount,
    } = mount(Bar);
    const user = () => container.querySelector('[data-nav="user"]')?.className;
    expect(user()).toBe('');
    await act(async () => {
      await router.pushLocation({
        path: '/user/5',
      });
      await router.pushLocation({
        path: '/somewhere',
      });
    });
    expect(nav.getState().section).toBe('/user/:id');
    expect(user()).toBe('active');
    unmount();
  });
});

describe('links (D-043)', () => {
  it('href: a string read as <a href> reads it, or a change object — the values encoded', () => {
    const {
      nav,
    } = inMemory('/#/shop/');
    const Links = () => h(
      'nav', null,
      h(
        nav.Link as unknown as string, {
          href: '42',
          'data-link': 'relative',
        }, 'a',
      ),
      h(
        nav.Link as unknown as string, {
          href: {
            path: '/search',
            query: {
              q: 'a&b',
            },
          },
          'data-link': 'object',
        }, 'b',
      ),
      h(
        nav.Link as unknown as string, {
          'data-link': 'here',
        }, 'c',
      ),
    );
    const {
      container, unmount,
    } = mount(Links);
    const href = (name: string) => container.querySelector(`[data-link="${name}"]`)?.getAttribute('href');
    expect(href('relative')).toBe('#/shop/42');
    expect(href('object')).toBe('#/search?q=a%26b');
    expect(href('here')).toBe('#/shop/');
    unmount();
  });

  it('resolveHref, fixedPathOf, isFixedPattern', () => {
    const current = urlParse('/catalog/shoes?sort=price');
    expect(resolveHref('?sort=name', current).href).toBe('/catalog/shoes?sort=name');
    expect(resolveHref('42', current).path).toBe('/catalog/42');
    expect(resolveHref('../x', current).path).toBe('/x');
    expect(resolveHref('/abs', urlParse('')).path).toBe('/abs');
    expect(fixedPathOf('/user/:id/posts')).toBe('/user');
    expect(fixedPathOf('/feed')).toBe('/feed');
    expect(fixedPathOf('/(.*)')).toBe('/');
    expect(fixedPathOf('')).toBe('/');
    expect(isFixedPattern('/feed')).toBe(true);
    expect(isFixedPattern('/user/:id')).toBe(false);
  });
});
