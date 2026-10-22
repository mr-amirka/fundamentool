// A router (fundamentool D-038, D-039): one part of the history — its location, its steps and its `params`.
import {
  custom,
  func,
  object,
} from '../schema';
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
import {
  createEvent,
} from '../Observable';
import type {
  TParams,
} from '../unparam';
import type {
  TUrlProps,
} from '../urlParse';
import {
  withAsyncLock,
} from '../withAsyncLock';
import {
  ROOT_PATH,
  THROTTLE_MS,
} from './constants';
import {
  locate,
} from './location';
import {
  BACK_OPTIONS,
  PARAMS_OPTIONS,
  STEP_OPTIONS,
} from './options';
import type {
  THistoryPrimitive,
  TParamsOptions,
  TRouter,
  TRouterDeps,
  TRouterDriver,
  TStepOptions,
} from './types';

const WHERE = '[fundamentool] createRouter';

/** The single list of `createRouter`'s keys. */
/** `createRouter`'s options (D-051): its history part, the observable adapter. */
const ROUTER_DEPS = object({
  historyPrimitive: custom<THistoryPrimitive>((value) => isObject(value)
    && isFunction((value as THistoryPrimitive).push)
    && isFunction((value as THistoryPrimitive).watch), 'a history primitive (e.g. browserHistoryPrimitivesProvider(window).hash)'),
  createObservable: func(),
  createApi: func(),
});

/** The single list of `createRouter`'s keys. */
export const ROUTER_DEPS_KEYS = ROUTER_DEPS.keys;

/** An empty query, shared (never changed). */
const NO_QUERY: TParams = {};

const getPath = (location: TUrlProps): string => location.path || ROOT_PATH;
const getQuery = (location: TUrlProps): TParams => location.query || NO_QUERY;


/** A location with the keys of `query` set over its own (`undefined` / `null` — the key removed). */
function withQuery(query: TParams, values: Record<string, unknown>): TParams {
  const next: TParams = {
    ...query,
  };
  for (const key of Object.keys(values)) {
    const value = values[key];
    if (isDefined(value)) {
      next[key] = value as TParams[string];
    } else {
      delete next[key];
    }
  }
  return next;
}

/**
 * A router over one part of the history (fundamentool D-039): `history.url`, `history.hash`, `history.state` or a
 * primitive of your own. Its location as observables — the one shown (`$location`) and the actual one, quiet steps
 * included (`$actualLocation`, D-045); its steps; its query as `params` / `actualParams`. A navigator over it
 * (`createNavigator({ router })`) takes its steps over — pages, windows, leave guards.
 *
 * @example
 * const router = createRouter({ historyPrimitive: browserHistoryPrimitivesProvider(window).hash, createObservable, createApi });
 * await router.pushLocation({ path: '/level/2' });
 * router.params.assign({ tab: 'map', zoom: 3 }, { replace: true });
 * button.onclick = router.backLocationThrottled;
 */
export function createRouter(deps: TRouterDeps): TRouter {
  ROUTER_DEPS.parse(deps, WHERE);
  const {
    historyPrimitive,
    createObservable,
    createApi,
  } = deps;
  const start = historyPrimitive.current().location;

  const $location = createObservable<TUrlProps>(start);
  const $actualLocation = createObservable<TUrlProps>(start);
  const $fromLocation = createObservable<TUrlProps | null>(null);
  const {
    emitLocation,
  } = createApi($location, {
    emitLocation: (_, location: TUrlProps) => location,
  });
  const {
    emitActual,
  } = createApi($actualLocation, {
    emitActual: (_, location: TUrlProps) => location,
  });
  const {
    emitFrom,
  } = createApi($fromLocation, {
    emitFrom: (_, location: TUrlProps | null) => location,
  });

  /** Where the history is now; a quiet step goes no further. */
  function setActual(location: TUrlProps): void {
    $actualLocation.getState().href === location.href || emitActual(location);
  }

  /** Shows `location` — the shown one before it becomes the from-location; a quiet one is only the actual one. */
  function show(location: TUrlProps, quiet?: boolean): void {
    setActual(location);
    const shown = $location.getState();
    if (quiet || shown === location) {
      return;
    }
    shown.href === location.href || emitFrom(shown);
    emitLocation(location);
  }

  // Without a navigator: the steps go to the primitive; the player's moves are shown as they come.
  let driver: TRouterDriver = {
    async push(location, options) {
      historyPrimitive.push(location);
      show(location, options?.quiet);
    },
    async replace(location, options) {
      historyPrimitive.replace(location);
      show(location, options?.quiet);
    },
    async back(count, options) {
      // As far back as the history goes; at the first entry Back would leave the app (and no move would be reported).
      let steps = count;
      while (steps > 0 && !historyPrimitive.canGo(-steps)) {
        steps--;
      }
      if (!steps) {
        return false;
      }
      show((await historyPrimitive.go(-steps)).location, options?.quiet);
      return true;
    },
  };
  let stopWatching: (() => void) | null = historyPrimitive.watch((entry) => show(entry.location));

  async function step(
    change: Partial<TUrlProps>, replace: boolean, options?: TStepOptions,
  ): Promise<TUrlProps> {
    const location = locate(change, $actualLocation.getState());
    await (replace ? driver.replace(location, options) : driver.push(location, options));
    return $location.getState();
  }

  /** The given parts set over the actual location's (the query merged) — a new entry, or with `replace` the current. */
  function extend(change: Partial<TUrlProps>, options?: TParamsOptions): Promise<TUrlProps> {
    const actual = $actualLocation.getState();
    return step(
      {
        path: change.path || getPath(actual),
        query: withQuery(getQuery(actual), change.query || NO_QUERY),
      }, !!options?.replace, options,
    );
  }

  const writeQuery = (query: TParams, options?: TParamsOptions) => void step(
    {
      path: getPath($actualLocation.getState()),
      query,
    }, !!options?.replace, options,
  );

  async function pushLocation(change: Partial<TUrlProps>, options?: TStepOptions): Promise<TUrlProps> {
    STEP_OPTIONS.parse(options, `${WHERE} pushLocation`);
    return step(
      change, false, options,
    );
  }

  async function replaceLocation(change: Partial<TUrlProps>, options?: TStepOptions): Promise<TUrlProps> {
    STEP_OPTIONS.parse(options, `${WHERE} replaceLocation`);
    return step(
      change, true, options,
    );
  }

  /** One step back; takes no arguments, so it is a handler as it is (`onClick={router.backLocation}`, D-045). */
  const backLocation = (): Promise<boolean> => driver.back(1);

  return {
    $location,
    $path: $location.map(getPath),
    $query: $location.map(getQuery),
    $actualLocation,
    $actualPath: $actualLocation.map(getPath),
    $actualQuery: $actualLocation.map(getQuery),
    $fromLocation,
    getLocation: () => $location.getState(),
    getActualLocation: () => $actualLocation.getState(),
    getFromLocation: () => $fromLocation.getState(),
    pushLocation,
    replaceLocation,
    async extendLocation(change, options) {
      PARAMS_OPTIONS.parse(options, `${WHERE} extendLocation`);
      return extend(change, options);
    },
    backLocation,
    async backRepeat(count, options) {
      if (!Number.isInteger(count) || count < 1) {
        throw new TypeError(`${WHERE} backRepeat: expects a whole number of steps ≥ 1, got ${describeValue(count)}`);
      }
      BACK_OPTIONS.parse(options, `${WHERE} backRepeat`);
      return driver.back(count, options);
    },
    pushLocationThrottled: withAsyncLock(pushLocation, {
      minMs: THROTTLE_MS,
    }),
    replaceLocationThrottled: withAsyncLock(replaceLocation, {
      minMs: THROTTLE_MS,
    }),
    backLocationThrottled: withAsyncLock(backLocation, {
      minMs: THROTTLE_MS,
    }),
    params: createParams($location, writeQuery),
    actualParams: createParams($actualLocation, writeQuery),
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
   * The query of a location (`$source` — the shown one or the actual one) as a key-value storage: a write is a step (a
   * new entry, or `replace`). It reads the query as last written — a step still queued by a navigator, or a quiet one,
   * is already there — and reports a changed key once `$source` has it (whoever changed it).
   */
  function createParams($source: typeof $location, write: (query: TParams, options?: TParamsOptions) => void): TKeyValueStorage<TParamsOptions> {
    // A change of a key is an event (D-049): reported as it happens, never at subscription
    const changed = createEvent<TKeyValueChange>();
    /** The query `$source` has. */
    let seen = getQuery($source.getState());
    /** The query as last written (or as `$source` has it, after a move). */
    let query = seen;
    $source.watch((location) => {
      const previous = seen;
      seen = getQuery(location);
      query = seen;
      for (const key of new Set([
        ...Object.keys(previous),
        ...Object.keys(seen),
      ])) {
        isEqual(previous[key], seen[key]) || changed({
          key,
          value: seen[key],
        });
      }
    });
    const storage: TKeyValueStorage<TParamsOptions> = {
      watch: changed.watch,
      set: (
        key, value, options,
      ) => storage.assign({
        [key]: value,
      }, options),
      assign(values, options) {
        PARAMS_OPTIONS.parse(options, `${WHERE} params`);
        const next = withQuery(query, values);
        if (!isEqual(next, query)) {
          query = next;
          write(next, options);
        }
        return storage;
      },
      get: (key) => query[key],
      remove: (key, options) => storage.assign({
        [key]: undefined,
      }, options),
      getKeys: () => Object.keys(query),
      clear(options) {
        PARAMS_OPTIONS.parse(options, `${WHERE} params`);
        if (Object.keys(query).length) {
          query = NO_QUERY;
          write({}, options);
        }
        return storage;
      },
    };
    return storage;
  }
}
