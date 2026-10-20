// A router (fundamentool D-038, D-039): one part of the history — its location, its steps and its `params`.
import {
  assertKnownOptions,
} from '../assertKnownOptions';
import {
  describeValue,
} from '../describeValue';
import {
  isDefined,
} from '../is/isDefined';
import {
  isEqual,
} from '../is/isEqual';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import type {
  TKeyValueChange,
  TKeyValueStorage,
} from '../keyValueStorage';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';
import {
  ROOT_PATH,
} from './constants';
import {
  ROUTER_INTERNAL,
} from './internal';
import type {
  TRouterDriver,
  TRouterWithInternal,
} from './internal';
import {
  locate,
} from './location';
import type {
  TBackOptions,
  TParamsOptions,
  TRouter,
  TRouterDeps,
} from './types';

const WHERE = '[fundamentool] createRouter';

/** The single list of `createRouter`'s keys. */
export const ROUTER_DEPS_KEYS = [
  'historyPrimitive',
  'createObservable',
  'createApi',
] as const;

/** An empty query, shared (never changed). */
const NO_QUERY: TParams = {};

const getPath = (location: TUrlProps): string => location.path || ROOT_PATH;
const getQuery = (location: TUrlProps): TParams => location.query || NO_QUERY;

/** `createRouter`'s dependencies, checked on creation (api-input-validation.md). */
function assertRouterDeps(deps: TRouterDeps): void {
  if (!isObject(deps)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describeValue(deps)}`);
  }
  assertKnownOptions(
    WHERE, deps, ROUTER_DEPS_KEYS,
  );
  const primitive = deps.historyPrimitive;
  if (!isObject(primitive) || !isFunction(primitive.push) || !isFunction(primitive.watch)) {
    throw new TypeError(`${WHERE}: "historyPrimitive" expects a history primitive (e.g. browserHistoryPrimitivesProvider(window).hash), got ${describeValue(primitive)}`);
  }
  for (const key of [
    'createObservable',
    'createApi',
  ] as const) {
    if (!isFunction(deps[key])) {
      throw new TypeError(`${WHERE}: "${key}" expects a function, got ${describeValue(deps[key])}`);
    }
  }
}

/**
 * A router over one part of the history (fundamentool D-039): `history.url`, `history.hash`, `history.state` or a
 * primitive of your own. Its location as observables, its steps, its query as `params`. A navigator over it
 * (`createNavigator({ router })`) takes its steps over — pages, windows, leave guards.
 *
 * @example
 * const router = createRouter({ historyPrimitive: browserHistoryPrimitivesProvider(window).hash, createObservable, createApi });
 * await router.pushLocation({ path: '/level/2' });
 * router.params.set('tab', 'map', { replace: true });
 */
export function createRouter(deps: TRouterDeps): TRouter {
  assertRouterDeps(deps);
  const {
    historyPrimitive,
    createObservable,
    createApi,
  } = deps;

  const $location = createObservable<TUrlProps>(historyPrimitive.current().location);
  const {
    show,
  } = createApi($location, {
    show: (_, location: TUrlProps) => location,
  });
  const $path = $location.map(getPath);
  const $query = $location.map(getQuery);

  // Without a navigator: the steps go to the primitive; the player's moves are shown as they come.
  let driver: TRouterDriver = {
    async push(location) {
      historyPrimitive.push(location);
      show(location);
    },
    async replace(location) {
      historyPrimitive.replace(location);
      show(location);
    },
    async back() {
      // At the first entry Back would leave the app (and no move would ever be reported).
      if (!historyPrimitive.canGo(-1)) {
        return false;
      }
      show((await historyPrimitive.go(-1)).location);
      return true;
    },
  };
  let stopWatching: (() => void) | null = historyPrimitive.watch((entry) => show(entry.location));

  async function step(change: Partial<TUrlProps>, replace: boolean): Promise<TUrlProps> {
    const location = locate(change, $location.getState());
    await (replace ? driver.replace(location) : driver.push(location));
    return $location.getState();
  }

  const params = createParams($location, (query, options) => void step({
    path: getPath($location.getState()),
    query,
  }, !!options?.replace));

  const router: TRouterWithInternal = {
    $location,
    $path,
    $query,
    getLocation: () => $location.getState(),
    pushLocation: (change) => step(change, false),
    replaceLocation: (change) => step(change, true),
    backLocation: (options?: TBackOptions) => driver.back(options),
    params,
    [ROUTER_INTERNAL]: {
      historyPrimitive,
      attach(next) {
        if (!stopWatching) {
          throw new Error(`${WHERE}: the router already has a navigator — one per router`);
        }
        stopWatching();
        stopWatching = null;
        driver = next;
        return show;
      },
    },
  };
  return router;

  /** The location's query as a key-value storage: a change of a key is a step (a new entry, or `replace`). */
  function createParams($source: typeof $location, write: (query: TParams, options?: TParamsOptions) => void): TKeyValueStorage<TParamsOptions> {
    const $changes = createObservable<TKeyValueChange>({
      key: '',
    });
    const {
      emit,
    } = createApi($changes, {
      emit: (_, change: TKeyValueChange) => change,
    });
    let query = getQuery($source.getState());
    // Every changed key is reported once the location has it — whoever changed it.
    $source.watch((location) => {
      const previous = query;
      query = getQuery(location);
      for (const key of new Set([
        ...Object.keys(previous),
        ...Object.keys(query),
      ])) {
        isEqual(previous[key], query[key]) || emit({
          key,
          value: query[key],
        });
      }
    });
    const instance = $changes as unknown as TKeyValueStorage<TParamsOptions>;
    const set = (
      key: string, value: unknown, options?: TParamsOptions,
    ) => {
      if (!isEqual(query[key], value)) {
        const next: TParams = {
          ...query,
        };
        if (isDefined(value)) {
          next[key] = value as TParams[string];
        } else {
          delete next[key];
        }
        write(next, options);
      }
      return instance;
    };
    return Object.assign(instance, {
      set,
      get: (key: string) => query[key],
      remove: (key: string, options?: TParamsOptions) => set(
        key, undefined, options,
      ),
      getKeys: () => Object.keys(query),
      clear: (options?: TParamsOptions) => {
        Object.keys(query).length && write({}, options);
        return instance;
      },
    });
  }
}
