/**
 * A router (fundamentool D-038, D-039): one part of the history — its location, its steps, its `params` — over the
 * in-memory primitives; and the route table's matcher.
 */
import {
  createApi,
  createObservable,
} from '../../src/Observable';
import {
  storeProvider,
} from '../../src/storeProvider';
import {
  createRouter,
  memoryHistoryPrimitivesProvider,
  ROUTER_DEPS_KEYS,
  routeTableMatcher,
} from '../../src/router';
import type {
  TRouterDeps,
} from '../../src/router';
import {
  routerInternal,
} from '../../src/router/internal';
import type {
  TRouterInternal,
} from '../../src/router/internal';
import {
  locate,
} from '../../src/router/location';
import {
  urlParse,
} from '../../src/urlParse';
import {
  waitFor,
} from './_harness';

function setup(start = '/a?x=1') {
  const history = memoryHistoryPrimitivesProvider(start);
  const router = createRouter({
    historyPrimitive: history.url,
    createObservable,
    createApi,
  });
  return {
    history,
    router,
  };
}

describe('createRouter', () => {
  it('its location as observables, from the part', () => {
    const {
      router,
    } = setup();
    expect(router.getLocation()).toMatchObject({
      path: '/a',
      query: {
        x: 1,
      },
    });
    expect(router.$path.getState()).toBe('/a');
    expect(router.$query.getState()).toEqual({
      x: 1,
    });
    expect(setup('/').router.$query.getState()).toEqual({});
    expect(setup('?x=1').router.$path.getState()).toBe('/'); // an address without a path
    expect(locate({}, urlParse('?x=1')).path).toBe('/');

  });

  it('push / replace: a path (or the current one) with its query; back; the player\'s moves are shown', async () => {
    const {
      router, history,
    } = setup();
    await expect(router.pushLocation({
      path: '/b',
      query: {
        y: '2',
      },
    })).resolves.toMatchObject({
      path: '/b',
      query: {
        y: 2, // as a reload reads it
      },
    });
    await router.replaceLocation({
      query: {
        z: 3,
      },
    });
    expect(router.getLocation().href).toBe('/b?z=3');
    expect(history.entries()).toEqual([
      '/a?x=1',
      '/b?z=3',
    ]);
    await expect(router.backLocation()).resolves.toBe(true);
    expect(router.$path.getState()).toBe('/a');
    history.navigate(1);
    await waitFor(() => expect(router.$path.getState()).toBe('/b'));
  });

  it('back at the first entry: not taken — it would leave the app, and no move would ever be reported', async () => {
    const {
      router, history,
    } = setup();
    await expect(router.backLocation()).resolves.toBe(false);
    expect(history.index()).toBe(0);
    expect(router.$path.getState()).toBe('/a');
  });

  it('params: the query as a key-value storage — a change is a step (or a replace); every changed key is reported', async () => {
    const {
      router, history,
    } = setup();
    const changes: unknown[] = [];
    router.params.watch((change) => changes.push(change));
    expect(router.params.get('x')).toBe(1);
    router.params.set('tab', 'map');
    await waitFor(() => expect(router.params.get('tab')).toBe('map'));
    expect(history.entries()).toHaveLength(2);
    router.params.set('tab', 'map'); // the same value: nothing
    router.params.set(
      'scroll', 120, {
        replace: true,
      },
    );
    await waitFor(() => expect(router.params.get('scroll')).toBe(120));
    expect(history.entries()).toHaveLength(2);
    expect(router.params.getKeys().sort()).toEqual([
      'scroll',
      'tab',
      'x',
    ]);
    router.params.remove('x');
    await waitFor(() => expect(router.params.get('x')).toBeUndefined());
    router.params.clear({
      replace: true,
    });
    await waitFor(() => expect(router.params.getKeys()).toEqual([]));
    router.params.clear(); // nothing to clear: no step
    expect(history.entries()).toHaveLength(3);
    expect(changes).toEqual([
      {
        key: 'tab',
        value: 'map',
      },
      {
        key: 'scroll',
        value: 120,
      },
      {
        key: 'x',
        value: undefined,
      },
      {
        key: 'scroll',
        value: undefined,
      },
      {
        key: 'tab',
        value: undefined,
      },
    ]);
  });

  it('params is storeProvider\'s port: a store kept in the address', async () => {
    const {
      router,
    } = setup('/');
    const createStore = storeProvider({
      createStore: createObservable,
      createApi,
    }, router.params);
    const $tab = createStore<string>('tab', 'list');
    expect($tab.getState()).toBe('list');
    $tab.setState('map');
    await waitFor(() => expect(router.getLocation().href).toBe('/?tab=map'));
    expect($tab.getState()).toBe('map');
  });

  it('checks its dependencies; one navigator per router', () => {
    const history = memoryHistoryPrimitivesProvider();
    const deps = {
      historyPrimitive: history.url,
      createObservable,
      createApi,
    };
    expect(ROUTER_DEPS_KEYS).toEqual(Object.keys(deps));
    expect(() => createRouter(null as never)).toThrow(/createRouter: expects an options object, got null/);
    expect(() => createRouter({
      ...deps,
      historyPrimitiv: 1,
    } as unknown as TRouterDeps)).toThrow(/Did you mean "historyPrimitive"/);
    expect(() => createRouter({
      ...deps,
      historyPrimitive: {},
    } as unknown as TRouterDeps)).toThrow(/"historyPrimitive" expects a history primitive/);
    expect(() => createRouter({
      ...deps,
      createApi: 1,
    } as unknown as TRouterDeps)).toThrow(/"createApi" expects a function, got number 1/);
    const router = createRouter(deps);
    const driver = {
      push: async () => undefined,
      replace: async () => undefined,
      back: async () => false,
    };
    // The plumbing isn't the router's API: it sits under an internal key.
    expect(Object.keys(router)).not.toContain('attach');
    const internal = routerInternal(router) as TRouterInternal;
    internal.attach(driver);
    expect(() => internal.attach(driver)).toThrow(/already has a navigator/);
    expect(routerInternal(null)).toBeUndefined();
  });
});

describe('routeTableMatcher', () => {
  it('the first row that fits, its parameters decoded; `-` and `_` match each other before the first group', () => {
    const match = routeTableMatcher([
      [
        '/user_list(/:id)?',
        {
          name: 'users',
        },
      ],
      [
        '/level/:levelId',
        {
          name: 'level',
        },
      ],
    ]);
    expect(match('/level/L%2F1')).toEqual({
      row: {
        name: 'level',
      },
      params: expect.objectContaining({
        levelId: 'L/1',
      }),
    });
    expect(match('/user-list/7')?.row.name).toBe('users');
    expect(match('/user-list/7')?.params.id).toBe('7');
    expect(match('/user_list')?.params.id).toBeUndefined(); // an optional group left out
    expect(match('/nowhere')).toBeNull();
  });
});
