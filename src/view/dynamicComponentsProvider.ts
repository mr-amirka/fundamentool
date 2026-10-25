// Components loaded in files of their own, declared where they are used (web-games D-097, D-098): one instance per
// app keeps every such module in a registry — its total readiness, preloading everything, one look for "loading" and
// "failed". Over the view library the app passes in (React, Preact `compat`), as the other view bindings (D-048).
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
} from '../browser/dynamicModule';
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

/** What a failed module's components show: the error, and a way to try again. */
export type TDynamicFailure = {
  error: unknown;
  /** Fetches the module again (`dynamicModule` forgets a failure). */
  retry: () => void;
};

/** Options of an instance (`createDynamicComponents`): how the app shows a module on its way and a failed one. */
export type TDynamicComponentsOptions = {
  /** Shown while a module is on its way; default nothing. */
  renderLoading?: () => unknown;
  /** Shown when a module can't be fetched — the app's message and Retry, in its texts; default nothing. */
  renderFailed?: (failure: TDynamicFailure) => unknown;
};

/** The registry's state: every module declared so far, how many are in, how many failed. */
export type TDynamicState = {
  total: number;
  loaded: number;
  failed: number;
};

/** A module's exports as components: each export a component the instance loads, then renders. */
export type TDynamicExports<M> = { readonly [K in keyof M]: M[K] };

/** An app's instance: declare a module where it's used; the registry of all of them. */
export type TDynamicComponents = {
  /**
   * Declares a module in its own file — registered, not fetched yet. Its exports read as components: rendered, they
   * fetch the module (once) and show the export.
   *
   * @example
   * const dynamicComponents = wgDynamicComponents(() => import('./ShopContent'));
   * <dynamicComponents.ShopContent />
   */
  <M extends object>(load: () => Promise<M>): TDynamicExports<M>;
  /** Every module declared: total, loaded, failed — the total readiness (a boot step's progress). */
  $state: Observable<TDynamicState>;
  /** Fetches every module declared so far; resolves when all are in, rejects with the first failure. */
  preload: () => Promise<void>;
};

/** A module's states. */
const IDLE = 'idle';
const LOADING = 'loading';
const LOADED = 'loaded';
const FAILED = 'failed';

/** A module in the registry. */
type TEntry = {
  load: () => Promise<object>;
  status: typeof IDLE | typeof LOADING | typeof LOADED | typeof FAILED;
  module: object | null;
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
 * The bindings of dynamic components over the app's view library (web-games D-098).
 *
 * @example
 * const { createDynamicComponents } = dynamicComponentsProvider(React);
 * export const wgDynamicComponents = createDynamicComponents({
 *   renderFailed: ({ retry }) => <PartFailed onRetry={retry} />,
 * });
 * // in the component's own file
 * const dynamicComponents = wgDynamicComponents(() => import('./ShopContent'));
 * openWindowOverlay({ title, content: dynamicComponents.ShopContent });
 * // the boot: every module declared, with the total readiness as its progress
 * wgDynamicComponents.$state.watch(({ total, loaded }) => report(total ? loaded / total : 1));
 * await wgDynamicComponents.preload();
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

  /** Makes an app's instance: its registry and its look for "loading" and "failed". */
  function createDynamicComponents(options: TDynamicComponentsOptions = {}): TDynamicComponents {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      OPTIONS().parse(options, `${WHERE} createDynamicComponents`);
    }
    const entries: TEntry[] = [];
    const $state = createObservable<TDynamicState>({
      total: 0,
      loaded: 0,
      failed: 0,
    });
    const count = (): void => {
      let loaded = 0;
      let failed = 0;
      for (const entry of entries) {
        if (entry.status === LOADED) {
          loaded++;
        } else if (entry.status === FAILED) {
          failed++;
        }
      }
      $state.setState({
        total: entries.length,
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
    const fetchEntry = (entry: TEntry): Promise<void> => {
      if (entry.status !== LOADING && entry.status !== LOADED) {
        entry.status = LOADING;
        changed(entry);
      }
      return entry.load().then((module) => {
        if (entry.status !== LOADED) {
          entry.module = module;
          entry.status = LOADED;
          changed(entry);
        }
      }, (error: unknown) => {
        entry.error = error;
        entry.status = FAILED;
        changed(entry);
        throw error;
      });
    };

    /** A component standing for the export `name` of an entry's module. */
    const partOf = (entry: TEntry, name: string) => function DynamicComponent(props: object): unknown {
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
        return createElement((entry.module as Record<string, unknown>)[name], props);
      }
      if (status === FAILED) {
        return options.renderFailed ? options.renderFailed({
          error: entry.error,
          retry: () => {
            fetchEntry(entry).catch(() => undefined);
          },
        }) : null;
      }
      return options.renderLoading ? options.renderLoading() : null;
    };

    const declare = <M extends object>(load: () => Promise<M>): TDynamicExports<M> => {
      const entry: TEntry = {
        load: dynamicModule(load) as () => Promise<object>,
        status: IDLE,
        module: null,
        error: null,
        listeners: new Set(),
      };
      entries.push(entry);
      count();
      const parts = new Map<string, unknown>();
      return new Proxy({}, {
        get: (_, name) => {
          const key = String(name);
          if (!parts.has(key)) {
            parts.set(key, partOf(entry, key));
          }
          return parts.get(key);
        },
      }) as TDynamicExports<M>;
    };

    return Object.assign(declare, {
      $state: $state as Observable<TDynamicState>,
      preload: () => Promise.all(entries.map(fetchEntry)).then(() => undefined),
    });
  }

  return {
    createDynamicComponents,
  };
}
