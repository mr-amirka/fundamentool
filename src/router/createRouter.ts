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
  locate,
} from './location';
import {
  assertFlags,
  BACK_OPTION_KEYS,
  PARAMS_OPTION_KEYS,
  STEP_OPTION_KEYS,
} from './options';
import type {
  TBackOptions,
  TParamsOptions,
  TRouter,
  TRouterDeps,
  TRouterDriver,
  TStepOptions,
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

  // Without a navigator: the steps go to the primitive; the player's moves are shown as they come; a quiet step isn't
  // shown (the next step that isn't quiet shows where the history is).
  let driver: TRouterDriver = {
    async push(location, options) {
      historyPrimitive.push(location);
      options?.quiet || show(location);
    },
    async replace(location, options) {
      historyPrimitive.replace(location);
      options?.quiet || show(location);
    },
    async back(options) {
      // At the first entry Back would leave the app (and no move would ever be reported).
      if (!historyPrimitive.canGo(-1)) {
        return false;
      }
      const entry = await historyPrimitive.go(-1);
      options?.quiet || show(entry.location);
      return true;
    },
  };
  let stopWatching: (() => void) | null = historyPrimitive.watch((entry) => show(entry.location));

  /** The location a step starts from: the history's (a quiet step leaves `$location` behind it). */
  const here = (): TUrlProps => historyPrimitive.current().location;

  async function step(
    change: Partial<TUrlProps>, replace: boolean, options?: TStepOptions,
  ): Promise<TUrlProps> {
    const location = locate(change, here());
    await (replace ? driver.replace(location, options) : driver.push(location, options));
    return $location.getState();
  }

  const params = createParams($location, (query, options) => void step(
    {
      path: getPath(here()),
      query,
    }, !!options?.replace, options,
  ));

  return {
    $location,
    $path,
    $query,
    getLocation: () => $location.getState(),
    async pushLocation(change, options) {
      assertFlags(
        `${WHERE} pushLocation`, options, STEP_OPTION_KEYS,
      );
      return step(
        change, false, options,
      );
    },
    async replaceLocation(change, options) {
      assertFlags(
        `${WHERE} replaceLocation`, options, STEP_OPTION_KEYS,
      );
      return step(
        change, true, options,
      );
    },
    async backLocation(options?: TBackOptions) {
      assertFlags(
        `${WHERE} backLocation`, options, BACK_OPTION_KEYS,
      );
      return driver.back(options);
    },
    params,
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
  };

  /**
   * The location's query as a key-value storage: a change of a key is a step (a new entry, or `replace`). It reads the
   * query as last written — a step still queued by a navigator, or a quiet one, is already there — and reports a
   * changed key once the location shows it (whoever changed it).
   */
  function createParams($source: typeof $location, write: (query: TParams, options?: TParamsOptions) => void): TKeyValueStorage<TParamsOptions> {
    const $changes = createObservable<TKeyValueChange>({
      key: '',
    });
    const {
      emit,
    } = createApi($changes, {
      emit: (_, change: TKeyValueChange) => change,
    });
    /** The query the location shows. */
    let shown = getQuery($source.getState());
    /** The query as last written (or shown, after a move by the player). */
    let query = shown;
    $source.watch((location) => {
      const previous = shown;
      shown = getQuery(location);
      query = shown;
      for (const key of new Set([
        ...Object.keys(previous),
        ...Object.keys(shown),
      ])) {
        isEqual(previous[key], shown[key]) || emit({
          key,
          value: shown[key],
        });
      }
    });
    const instance = $changes as unknown as TKeyValueStorage<TParamsOptions>;
    function writeQuery(next: TParams, options: TParamsOptions | undefined): void {
      query = next;
      write(next, options);
    }
    const set = (
      key: string, value: unknown, options?: TParamsOptions,
    ) => {
      assertFlags(
        `${WHERE} params`, options, PARAMS_OPTION_KEYS,
      );
      if (!isEqual(query[key], value)) {
        const next: TParams = {
          ...query,
        };
        if (isDefined(value)) {
          next[key] = value as TParams[string];
        } else {
          delete next[key];
        }
        writeQuery(next, options);
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
        assertFlags(
          `${WHERE} params`, options, PARAMS_OPTION_KEYS,
        );
        Object.keys(query).length && writeQuery({}, options);
        return instance;
      },
    });
  }
}
