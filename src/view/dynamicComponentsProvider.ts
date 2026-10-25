// Parts of an app in files of their own (web-games D-097, D-098, D-100): a module is declared where it's used, a
// component is picked out of it; one instance per app keeps every module in a registry — the total readiness, the
// modules that failed, a retry of them, preloading. Over the view library the app passes in (React, Preact `compat`), as
// the other view bindings (D-048).
import {
  viewLibraryShape,
} from './library';
import type {
  TViewLibrary,
} from './library';
import {
  custom,
  lazy,
  object,
} from '../schema';
import {
  dynamicModule,
} from '../dynamicModule';
import {
  createObservable,
} from '../Observable';
import type {
  Observable,
} from '../Observable';

const WHERE = '[fundamentool] dynamicComponentsProvider';

const LIBRARY = /*#__PURE__*/ lazy(() => object(viewLibraryShape([
  'createElement',
  'useSyncExternalStore',
  'useEffect',
])).passthrough());

/** The deps: the view library's members the bindings use. */
export type TDynamicComponentsDeps = Pick<TViewLibrary, 'createElement' | 'useSyncExternalStore' | 'useEffect'>;

/** A module's states. */
const IDLE = 'idle';
const LOADING = 'loading';
const LOADED = 'loaded';
const FAILED = 'failed';

/** Where a module is: not asked for yet, on its way, in, failed. */
export type TDynamicStatus = typeof IDLE | typeof LOADING | typeof LOADED | typeof FAILED;

/**
 * A module declared in the registry — lazy: nothing is fetched until a component of it is shown, the registry is
 * preloaded or `load()` is called (a real Promise would start the download at the declaration).
 */
export type TDynamicModule<M> = {
  /** Fetches the module — once; again after a failure. */
  load: () => Promise<M>;
  /** Where it is now. */
  readonly status: TDynamicStatus;
  /** The failure, while `status` is `'failed'`. */
  readonly error: unknown;
};

/** What a failed component shows: the error, and a way to try again. */
export type TDynamicFailure = {
  error: unknown;
  /** Fetches its module again. */
  retry: () => void;
};

/** Options of an instance: how the app shows a part on its way and a failed one. */
export type TDynamicComponentsOptions = {
  /** Shown while a part's module is on its way; default nothing. */
  renderLoading?: () => unknown;
  /** Shown when a part's module can't be fetched — the app's message and Retry, in its own texts; default nothing. */
  renderFailed?: (failure: TDynamicFailure) => unknown;
};

/** The registry: every module declared, how many are in, which failed. */
export type TDynamicState = {
  total: number;
  loaded: number;
  /** The modules that failed — `retry()` fetches them again. */
  failed: readonly TDynamicModule<unknown>[];
};

/**
 * An app's instance: declare modules, pick components out of them, watch and steer the registry. `E` — an element of
 * the app's view library (React's `ReactElement` when React is passed in).
 */
export type TDynamicComponents<E = unknown> = {
  /**
   * Declares a module in the registry — not fetched yet.
   *
   * @example
   * const shopModule = wgDynamicModule(() => import('./ShopContent'));
   */
  module: <M>(load: () => Promise<M>) => TDynamicModule<M>;
  /**
   * A component of a module: shown, it fetches the module (once) and renders what `pick` takes out of it; on its way —
   * the instance's loading look; failed — its failure look with Retry.
   *
   * @example
   * const ShopContent = wgDynamicComponent(shopModule, (m) => m.ShopContent);
   */
  component: <M, P extends object>(
    module: TDynamicModule<M>,
    pick: (value: M) => (props: P) => unknown,
  ) => (props: P) => E | null;
  /** The registry: total, loaded, the failed modules — the total readiness (a boot step's progress). */
  $state: Observable<TDynamicState>;
  /** Fetches every module declared; resolves when all are in, rejects with the first failure. */
  preload: () => Promise<void>;
  /** Fetches again the modules that failed; resolves when they are in. */
  retry: () => Promise<void>;
};

/** A module in the registry, as the instance keeps it. */
type TEntry = {
  fetch: () => Promise<unknown>;
  status: TDynamicStatus;
  value: unknown;
  error: unknown;
  listeners: Set<() => void>;
};

/** The options' schema (D-051). */
const OPTIONS = /*#__PURE__*/ lazy(() => object({
  renderLoading: custom<() => unknown>((value) => typeof value === 'function', 'a function').optional(),
  renderFailed: custom<(failure: TDynamicFailure) => unknown>((value) => typeof value === 'function', 'a function')
    .optional(),
}));

/**
 * The bindings of dynamic parts over the app's view library (web-games D-100).
 *
 * @example
 * const { createDynamicComponents } = dynamicComponentsProvider(React);
 * const dynamic = createDynamicComponents({ renderFailed: ({ retry }) => <PartFailed onRetry={retry} /> });
 * export const wgDynamicModule = dynamic.module;
 * export const wgDynamicComponent = dynamic.component;
 * // openWindowShop/index.tsx
 * const shopModule = wgDynamicModule(() => import('./ShopContent'));
 * const ShopContent = wgDynamicComponent(shopModule, (m) => m.ShopContent);
 * // the boot: everything declared, the total readiness as the progress; what failed — retried
 * dynamic.$state.watch(({ total, loaded }) => report(total ? loaded / total : 1));
 * await dynamic.preload().catch(() => dynamic.retry());
 */
export function dynamicComponentsProvider<D extends TDynamicComponentsDeps>(deps: D) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    LIBRARY().parse(deps, WHERE);
  }
  const {
    createElement,
    useSyncExternalStore,
    useEffect,
  } = deps;

  /** An element of the app's view library — React's `ReactElement` when React is passed in. */
  type TElement = ReturnType<D['createElement']>;

  /** Makes an app's instance: its registry and its look for "loading" and "failed". */
  function createDynamicComponents(options: TDynamicComponentsOptions = {}): TDynamicComponents<TElement> {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      OPTIONS().parse(options, `${WHERE} createDynamicComponents`);
    }
    const entries = new Map<TDynamicModule<unknown>, TEntry>();
    const $state = createObservable<TDynamicState>({
      total: 0,
      loaded: 0,
      failed: [],
    });
    const count = (): void => {
      let loaded = 0;
      const failed: TDynamicModule<unknown>[] = [];
      for (const [
        handle,
        entry,
      ] of entries) {
        if (entry.status === LOADED) {
          loaded++;
        } else if (entry.status === FAILED) {
          failed.push(handle);
        }
      }
      $state.setState({
        total: entries.size,
        loaded,
        failed,
      });
    };
    const changed = (entry: TEntry): void => {
      count();
      for (const listener of Array.from(entry.listeners)) {
        listener();
      }
    };

    /** Fetches an entry's module (once; again after a failure). */
    const fetchEntry = (entry: TEntry): Promise<unknown> => {
      if (entry.status === IDLE || entry.status === FAILED) {
        entry.status = LOADING;
        changed(entry);
      }
      return entry.fetch().then((value) => {
        if (entry.status !== LOADED) {
          entry.value = value;
          entry.status = LOADED;
          changed(entry);
        }
        return value;
      }, (error: unknown) => {
        entry.error = error;
        entry.status = FAILED;
        changed(entry);
        throw error;
      });
    };

    const module = <M>(load: () => Promise<M>): TDynamicModule<M> => {
      const entry: TEntry = {
        fetch: dynamicModule(load),
        status: IDLE,
        value: undefined,
        error: undefined,
        listeners: new Set(),
      };
      const handle: TDynamicModule<M> = {
        load: () => fetchEntry(entry) as Promise<M>,
        get status() {
          return entry.status;
        },
        get error() {
          return entry.error;
        },
      };
      entries.set(handle as TDynamicModule<unknown>, entry);
      count();
      return handle;
    };

    const component = <M, P extends object>(
      handle: TDynamicModule<M>,
      pick: (value: M) => (props: P) => unknown,
    ): (props: P) => TElement | null => {
      const entry = entries.get(handle as TDynamicModule<unknown>);
      if (!entry) {
        throw new TypeError(`${WHERE}: the module wasn't declared by this instance (\`module(load)\`)`);
      }
      return function DynamicComponent(props: P): TElement | null {
        const status = useSyncExternalStore((onChange: () => void) => {
          entry.listeners.add(onChange);
          return () => {
            entry.listeners.delete(onChange);
          };
        }, () => entry.status);
        useEffect(() => {
          if (entry.status === IDLE) {
            fetchEntry(entry).catch(() => undefined);
          }
        }, []);
        if (status === LOADED) {
          return createElement(pick(entry.value as M), props);
        }
        if (status === FAILED) {
          return options.renderFailed ? options.renderFailed({
            error: entry.error,
            retry: () => {
              fetchEntry(entry).catch(() => undefined);
            },
          }) as TElement : null;
        }
        return options.renderLoading ? options.renderLoading() as TElement : null;
      };
    };

    return {
      module,
      component,
      $state: $state as Observable<TDynamicState>,
      preload: () => Promise.all(Array.from(entries.values(), fetchEntry)).then(() => undefined),
      retry: () => Promise.all(Array.from(entries.values())
        .filter((entry) => entry.status === FAILED)
        .map(fetchEntry)).then(() => undefined),
    };
  }

  return {
    createDynamicComponents,
  };
}
