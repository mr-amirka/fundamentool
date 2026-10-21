/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The reference router's members back (fundamentool D-045): the actual location, merging steps, `params.assign`,
 * the from-location, argument-free backs, `backRepeat` / `backToDepth`, throttled steps, the history shortcuts.
 */
import {
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  createRouter,
  memoryHistoryPrimitivesProvider,
} from '../../src/router';
import type {
  TRouter,
} from '../../src/router';
import {
  inMemory,
  settle,
  waitFor,
} from './_harness';

/** A router alone over an in-memory address. */
function alone(start = '/a') {
  const history = memoryHistoryPrimitivesProvider(start);
  const router: TRouter = createRouter({
    historyPrimitive: history.url,
    createObservable,
    createApi,
  });
  return {
    history,
    router,
  };
}

/** A navigator with its host's table, over the hash of an in-memory address. */
function withNavigator(start = '/#/home') {
  const made = inMemory(start);
  made.nav.NavigationHostProvider({
    routes: [
      [
        '/home',
        {
          main: 'home',
        },
      ],
      [
        '/list',
        {
          main: 'list',
        },
      ],
      [
        '/item/:id',
        {
          main: 'item',
        },
      ],
    ],
  });
  return made;
}

describe('the actual location (D-045)', () => {
  it('the shown members stay behind a quiet step; the actual ones and actualParams follow it', async () => {
    const {
      router,
    } = alone('/a?draft=0');
    const actualChanges: unknown[] = [];
    router.actualParams.watch((change) => actualChanges.push(change));
    await router.pushLocation({
      path: '/wizard/3',
      query: {
        draft: 1,
      },
    }, {
      quiet: true,
    });
    expect(router.$path.getState()).toBe('/a');
    expect(router.$actualPath.getState()).toBe('/wizard/3');
    expect(router.$actualQuery.getState()).toEqual({
      draft: 1,
    });
    expect(router.getActualLocation().href).toBe('/wizard/3?draft=1');
    expect(router.params.get('draft')).toBe(0); // the shown query
    expect(router.actualParams.get('draft')).toBe(1);
    expect(actualChanges).toEqual([
      {
        key: 'draft',
        value: 1,
      },
    ]);
    await router.pushLocation({
      path: '/wizard/4',
    });
    expect(router.$path.getState()).toBe('/wizard/4');
    expect(router.params.get('draft')).toBeUndefined();
  });

  it('with a navigator: its quiet steps move the actual location, the shown one waits', async () => {
    const {
      router,
    } = withNavigator();
    await router.pushLocation({
      path: '/list',
    }, {
      quiet: true,
    });
    expect(router.$path.getState()).toBe('/home');
    expect(router.$actualPath.getState()).toBe('/list');
    await router.pushLocation({
      path: '/item/1',
    });
    expect(router.$path.getState()).toBe('/item/1');
    expect(router.$actualPath.getState()).toBe('/item/1');
  });
});

describe('merging steps (D-045)', () => {
  it('extendLocation: the given parts changed, the rest kept — the query merged, undefined removes a key', async () => {
    const {
      router, history,
    } = alone('/catalog?sort=price&page=1');
    await router.extendLocation({
      query: {
        page: 2,
      },
    });
    expect(router.getLocation().query).toEqual({
      sort: 'price',
      page: 2,
    });
    await router.extendLocation({
      path: '/catalog/shoes',
      query: {
        page: undefined,
      },
    }, {
      replace: true,
    });
    expect(history.entries()).toEqual([
      '/catalog?sort=price&page=1',
      '/catalog/shoes?sort=price',
    ]);
    await router.extendLocation({});
    expect(router.getLocation().href).toBe('/catalog/shoes?sort=price');
    await expect(router.extendLocation({}, {
      rplace: true,
    } as never)).rejects.toThrow(/Did you mean "replace"/);
  });

  it('params.assign: several keys in one entry; nothing changed — no step', async () => {
    const {
      router, history,
    } = alone('/a?x=1');
    router.params.assign({
      sort: 'price',
      page: 2,
      x: undefined,
    });
    expect(history.entries()).toEqual([
      '/a?x=1',
      '/a?page=2&sort=price',
    ]);
    router.params.assign({
      sort: 'price',
    });
    expect(history.entries()).toHaveLength(2);
    router.actualParams.assign({
      page: 3,
    }, {
      replace: true,
    });
    expect(history.entries()).toEqual([
      '/a?x=1',
      '/a?page=3&sort=price',
    ]);
    expect(() => router.params.assign({}, {
      quite: true,
    } as never)).toThrow(/Did you mean "quiet"/);
  });
});

describe('the from-location (D-045)', () => {
  it('the location shown before the last change, in either direction; a quiet step doesn\'t change it', async () => {
    const {
      router, history,
    } = alone('/a');
    expect(router.getFromLocation()).toBeNull();
    const seen: (string | undefined)[] = [];
    router.$fromLocation.watch((location) => seen.push(location?.path));
    await router.pushLocation({
      path: '/b',
    });
    expect(router.getFromLocation()?.path).toBe('/a');
    await router.backLocation();
    expect(router.getFromLocation()?.path).toBe('/b');
    history.navigate(1); // the player's Forward
    await waitFor(() => expect(router.getFromLocation()?.path).toBe('/a'));
    await router.pushLocation({
      path: '/c',
    }, {
      quiet: true,
    });
    expect(router.getFromLocation()?.path).toBe('/a');
    await router.replaceLocation({
      path: '/b',
    }); // the same address as shown: nothing changed
    expect(seen).toEqual([
      '/a',
      '/b',
      '/a',
    ]);
  });
});

describe('backs without arguments, and with them (D-045)', () => {
  it('backLocation ignores what a handler passes; backRepeat goes as far as the history goes', async () => {
    const {
      router, history,
    } = alone('/a');
    await router.pushLocation({
      path: '/b',
    });
    await router.pushLocation({
      path: '/c',
    });
    await expect((router.backLocation as (event: unknown) => Promise<boolean>)({
      type: 'click',
    })).resolves.toBe(true);
    expect(router.$path.getState()).toBe('/b');
    await expect(router.backRepeat(5)).resolves.toBe(true); // only one step was there
    expect(history.index()).toBe(0);
    await expect(router.backRepeat(1)).resolves.toBe(false);
    await expect(router.backRepeat(1.5)).rejects.toThrow(/backRepeat: expects a whole number of steps ≥ 1, got number 1.5/);
    await expect(router.backRepeat(1, {
      forse: true,
    } as never)).rejects.toThrow(/Did you mean "force"/);
  });

  it('with a navigator: backRepeat closes several entries in one move; backToRoot and leavePage ignore a handler\'s event', async () => {
    const {
      router, nav,
    } = withNavigator();
    await router.pushLocation({
      path: '/list',
    });
    await router.pushLocation({
      path: '/item/1',
    });
    await expect(router.backRepeat(2)).resolves.toBe(true);
    expect(nav.getHistory()).toHaveLength(1);
    await router.pushLocation({
      path: '/list',
    });
    await expect((nav.backToRoot as (event: unknown) => Promise<boolean>)({
      type: 'click',
    })).resolves.toBe(true);
    expect(nav.getHistory()).toHaveLength(1);
  });
});

describe('throttled steps (D-045)', () => {
  it('a call while the last one runs — or within 300 ms of its start — is skipped', async () => {
    const {
      router, history,
    } = alone('/a');
    const first = router.pushLocationThrottled({
      path: '/b',
    });
    await expect(router.pushLocationThrottled({
      path: '/c',
    })).resolves.toBeUndefined();
    await first;
    expect(history.entries()).toEqual([
      '/a',
      '/b',
    ]);
    await settle(320);
    await router.replaceLocationThrottled({
      path: '/c',
    });
    expect(history.entries()).toEqual([
      '/a',
      '/c',
    ]);
    await expect(router.backLocationThrottled()).resolves.toBe(true);
    await expect(router.backLocationThrottled()).resolves.toBeUndefined();
  });
});

describe('the history shortcuts (D-045)', () => {
  it('getHistory, getPrevLocation, getNextLocation, $depth', async () => {
    const {
      router, nav,
    } = withNavigator();
    const depths: number[] = [];
    nav.$depth.watch((depth) => depths.push(depth));
    expect(nav.getPrevLocation()).toBeUndefined();
    expect(nav.getNextLocation()).toBeUndefined();
    await router.pushLocation({
      path: '/list',
    });
    await router.pushLocation({
      path: '/item/1',
    });
    expect(nav.getHistory().map((entry) => entry.kind === 'page' && entry.location.path)).toEqual([
      '/home',
      '/list',
      '/item/1',
    ]);
    expect(nav.getPrevLocation()?.path).toBe('/list');
    await router.backLocation();
    expect(nav.getNextLocation()?.path).toBe('/item/1');
    void nav.open(
      'Menu', null, {
        reopen: true,
      },
    );
    await waitFor(() => expect(nav.getHistory()).toHaveLength(3));
    expect(nav.getPrevLocation()?.path).toBe('/list'); // under a window: the page's
    await router.backLocation();
    expect(nav.getNextLocation()?.path).toBe('/list'); // a window ahead: the page under it
    expect(depths).toEqual([
      1,
      2,
      1,
      2,
      1,
    ]);
  });
});
