import type {
  Observable, TObservableAdapter,
} from './Observable/types';

type TElementType = any;
type TAnchorProps = Record<string, any>;
type TClickEvent = { preventDefault?: () => void } & Record<string, any>;
type TEffectCallback = () => void | (() => void | undefined);
type TDependencyList = ReadonlyArray<unknown>;

import {
  wait, 
} from './wait';
import {
  wrapper, 
} from './wrapper';
import {
  urlParse, TUrlProps, 
} from './urlParse';
import {
  urlExtend, 
} from './urlExtend';
import {
  TParams, 
} from './unparam';
import {
  routeParseProvider, 
} from './routeParseProvider';
import {
  TRouteMapper, 
} from './regexpMapperProvider';
import {
  queueProvider, 
} from './queueProvider';
import {
  isPromise, 
} from './is/isPromise';
import {
  isMatch, 
} from './is/isMatch';
import {
  isEqual, 
} from './is/isEqual';
import {
  childClassOfReact, 
} from './childClassOfReact';
import {
  noop, 
} from './noop';
import {
  extend, 
} from './extend';
import {
  isFunction, 
} from './is/isFunction';
import {
  once, 
} from './once';

export type {
  TUrlProps, TParams, TRouteMapper, 
};

export type TRouteProps = {
  route: TRoute;
  active: boolean;
};
export type TRouteHandler<T> = (params: TParams, location: TUrlProps) => T | undefined | null;
export type TRouteArgs<T> = [string, TRouteHandler<T> | T];
export type TLockWatcherOptions = {
  backwards?: boolean;
  forwards?: boolean;
};
export type TLockWatcherFn = (loc: TUrlProps) => any | Promise<any>;
export type TLockWatcher = TLockWatcherOptions & {
  callback: TLockWatcherFn;
};
export type TAfterReturningCallback = () => void | Promise<void>;
export type TLocationNavigationOptions = {
  quiet?: boolean;
};
export type TLocationOptions = TLocationNavigationOptions & {
  onBeforeUnload?: TLockWatcherFn | TLockWatcher | null;
};

export type TLinkProps = {
  options?: Partial<TUrlProps>;
  onClick?: (event: TClickEvent) => void | boolean | Promise<void | boolean>;
  timeout?: number;
  active?: boolean;
  activeAsParent?: boolean;
  component?: TElementType;
} & TAnchorProps;

export type TPushLocation = (
  extendsLocation: Partial<TUrlProps>,
  options?: TLocationOptions,
) => Promise<TUrlProps>;

export type TRouterState = {
  depth: number;
  prev: null | TUrlProps;
  location: TUrlProps;
  history: (TUrlProps | null)[];
};

export type TRoute = {
  index: number;
  params: TParams;
} & TRouterState &
  Record<string, any>;

export type TBackLocationResponse = {
  locked: boolean;
};

type TBackStackItem = [() => void, (response: TBackLocationResponse) => void];
const NOOP_OBJECT: TParams = {};

/**
 * The default lock watcher options.
 * 
 * @type {Object}
 * @property {boolean} forwards - Whether to watch forwards.
 * @property {boolean} backwards - Whether to watch backwards.
 */
export const DEFAULT_LOCK_WATCHER_OPTIONS = {
  forwards: false,
  backwards: true,
};

/**
 * Merges two URL properties.
 * 
 * @param prev - The previous URL properties.
 * @param extend - The extended URL properties.
 * @returns The merged URL properties.
 * @example
 * mergeLocation({ path: '/user', query: { id: 1 } }, { path: '/user/1', query: { name: 'John' } }); // => { path: '/user/1', query: { id: 1, name: 'John' } }
 */
export function mergeLocation(prev: Partial<TUrlProps>, exten: Partial<TUrlProps>) {
  const child: Partial<TUrlProps> = exten.child || {};
  const prevChild: Partial<TUrlProps> = prev.child || {};
  return urlExtend(exten.path || prev.path, {
    query: exten.query || null,
    child: urlExtend(child.path || prevChild.path, {
      query: child.query || null,
    }),
  });
}

/**
 * Waits for a transition.
 * 
 * @returns A promise that resolves after 50 milliseconds.
 * @example
 * waitTransition(); // => Promise<void>
 */
function waitTransition() {
  return wait(50);
}

/**
 * Gets the path from a URL properties.
 * 
 * @param v - The URL properties.
 * @returns The path.
 * @example
 * getPath({ path: '/user' }); // => '/user'
 */
function getPath(v: Partial<TUrlProps>) {
  return v.path || '';
}

/**
 * Gets the child from a URL properties.
 * 
 * @param v - The URL properties.
 * @returns The child.
 * @example
 * getChild({ child: { path: '/user' } }); // => { path: '/user' }
 */
function getChild(v: Partial<TUrlProps>): TUrlProps {
  return urlExtend(v.child);
}

/**
 * Gets the query from a URL properties.
 * 
 * @param v - The URL properties.
 * @returns The query.
 * @example
 * getQuery({ query: { id: 1 } }); // => { id: 1 }
 */
function getQuery(v: Partial<TUrlProps>): TParams {
  return v.query || NOOP_OBJECT;
}

/**
 * Creates a router for an observable map.
 * 
 * @param _routes - The routes.
 * @param notFoundHandler - The not found handler.
 * @returns A router.
 * @example
 * routerForObservableMapProvider([['/user', (params, location) => <User />]], (params, location) => <NotFound />); // => <Router />
 */
export function routerForObservableMapProvider<T>(_routes: TRouteArgs<T>[],
  notFoundHandler?: TRouteHandler<T>) {
  const routes: [TRouteMapper, TRouteHandler<T>][] = _routes.map(([route, render]) => {
    let scopePos = route.indexOf('(');
    const length = route.length;
    if (scopePos > -1) {
      scopePos = length;
    }

    const handler = (isFunction(render) ? render : wrapper(render)) as TRouteHandler<T>;

    return [routeParseProvider(route.slice(0, scopePos).replace(/[-_]/gim, '[-_]') + route.slice(scopePos, length)), handler];
  });
  return (state: TRouterState): T & TRoute => {
    const {
      location, 
    } = state;
    const path = location.path || '';
    const length = routes.length;
    let i = 0,
      params: TParams = {},
      result: any,
      route: [TRouteMapper, TRouteHandler<T>];
    for (; i < length; i++) {
      route = routes[i];
      if (route[0](path, (params = {})) && (result = route[1](params, location))) {
        break;
      }
    }

    if (!result && notFoundHandler) {
      result = notFoundHandler(params, location);
    }

    return {
      ...state,
      index: i,
      params,
      location,
      ...(result || {}),
    };
  };
}

/**
 * Creates a router for a location.
 * 
 * @param $state - The state.
 * @returns A router.
 * @example
 * routerByLocationProviderProvider($state); // => <Router />
 */
export function routerByLocationProviderProvider<A extends TRouterState>($state: Observable<A>) {
  return function routerByLocationProvider<T>(routes: TRouteArgs<T>[],
    notFoundHandler?: TRouteHandler<T>) {
    return $state.map(routerForObservableMapProvider(routes, notFoundHandler));
  };
}

/**
 * The router provider options.
 * 
 * @param window - The window.
 * @param Component - The component.
 * @param useEffect - The useEffect.
 * @param createElement - The createElement.
 * @param forwardRef - The forwardRef.
 * @param createObservable - The createObservable.
 * @param createApi - The createApi.
 * @returns A router.
 * @example
 * routerProviderBase({ window: window, Component: Component, useEffect: useEffect, createElement: createElement, forwardRef: forwardRef, createObservable: createObservable, createApi: createApi }); // => <Router />
 */
export type TRouterProviderDeps = TObservableAdapter & {
  window: Window;
  Component: TElementType;
  useEffect: (...args: any[]) => void;
  createElement: (...args: any[]) => any;
  forwardRef: (...args: any[]) => any;
};

/**
 * The router provider base.
 * 
 * @param options - The router provider options.
 * @returns A router.
 * @example
 * routerProviderBase({ window: window, Component: Component, useEffect: useEffect, createElement: createElement, forwardRef: forwardRef, createObservable: createObservable, createApi: createApi }); // => <Router />
 */
function routerProviderBase({
  Component,
  window,
  createElement,
  forwardRef,
  useEffect,
  createObservable,
  createApi,
}: TRouterProviderDeps) {
  const {
    location, history, 
  } = window;
  let _skipPop = 0;
  let _quiet = false;
  let _hasDurationLink = false;
  let _fromLocation: TUrlProps | null = null;
  let _currentLocation = parseLocation();
  let _locked = 0;
  let _currentDepth = history.state?.depth || 0;
  let _historyStack = getHistory();
  let _historyStackBeforeUnload: TLockWatcher[][] = _historyStack.map(() => []);
  let _skipFocus: boolean[] = _historyStack.map(() => false);
  let _closing: boolean[] = _historyStack.map(() => false);
  let _finishCallbacks: (() => Promise<void>)[] = [];
  const _backStack: TBackStackItem[] = [];

  const $state = createObservable<TRouterState>({
    depth: _currentDepth,
    prev: getPrevLocation(),
    location: _currentLocation,
    history: [],
  });
  const {
    emitState, 
  } = createApi($state, {
    emitState: (_, payload: TRouterState) => payload,
  });

  const queue = queueProvider({
    onStart: () => {
      const finishCallbacks = _finishCallbacks;
      _finishCallbacks = [];

      return Promise.all(finishCallbacks.map((callback) => {
        return callback();
      }));
    },
  });

  const $trasitionState = createObservable<TRouterState>($state.getState());
  const {
    emitTransition, 
  } = createApi($trasitionState, {
    emitTransition: (state, payload: Partial<TRouterState>) => ({
      ...state,
      ...payload,
    }),
  });

  const $historyDepth = createObservable<number>(_currentDepth);
  const {
    emitHistoryDepth, 
  } = createApi($historyDepth, {
    emitHistoryDepth: (_, payload: number) => payload,
  });

  const $stateHash = $state.map((state) => ({
    ...state,
    current: state.location?.child || {},
    prev: state.prev?.child || {},
  }));

  const $trasitionStateHash = $trasitionState.map((state) => ({
    ...state,
    location: state.location?.child || {},
    prev: state.prev?.child || {},
  }));

  const $prevLocation = $trasitionState.map((state) => state.prev || {});
  const $prevQuery = $prevLocation.map(getQuery);
  const $prevPath = $prevLocation.map(getPath);
  const $prevHashLocation = $prevLocation.map(getChild);
  const $prevHashQuery = $prevHashLocation.map(getQuery);
  const $prevHashPath = $prevHashLocation.map(getPath);

  const $location = $trasitionState.map((state) => state.location);
  const $query = $location.map(getQuery);
  const $path = $location.map(getPath);
  const $hashLocation = $location.map(getChild);
  const $hashQuery = $hashLocation.map(getQuery);
  const $hashPath = $hashLocation.map(getPath);
  const Link = LinkProvider({
    pushLocation,
  });
  const HashLink = LinkProvider({
    pushLocation: pushHashLocation,
    hasHash: true,
  });
  const NavLink = NavLinkProvider(Link, $location);
  const HashNavLink = NavLinkProvider(HashLink, $hashLocation);

  const $immeidateLocation = $state.map((state) => state.location);
  const $immeidateQuery = $immeidateLocation.map(getQuery);
  const $immeidatePath = $immeidateLocation.map(getPath);
  const $immeidateHashLocation = $immeidateLocation.map(getChild);
  const $immeidateHashQuery = $immeidateHashLocation.map(getQuery);
  const $immeidateHashPath = $immeidateHashLocation.map(getPath);

  const changeLocation = queue((
    location: TUrlProps, _options?: TLocationOptions, replace?: boolean | number,
  ) => {
    const options = _options || {};
    const {
      onBeforeUnload, 
    } = options;
    const url = location.href;

    const beforeUnloadWatcher: TLockWatcher | null = onBeforeUnload
      ? ({
        ...DEFAULT_LOCK_WATCHER_OPTIONS,
        ...(isFunction(onBeforeUnload)
          ? {
            callback: onBeforeUnload,
          }
          : onBeforeUnload),
      } as TLockWatcher)
      : null;

    if (!replace) {
      _currentDepth++;
      _historyStack = _historyStack.slice(0, _currentDepth);
      _skipFocus = _skipFocus.slice(0, _currentDepth);
      _closing = _closing.slice(0, _currentDepth);
      _historyStackBeforeUnload = _historyStackBeforeUnload.slice(0, _currentDepth);
    }

    _historyStack[_currentDepth] = location;
    _historyStackBeforeUnload[_currentDepth] = beforeUnloadWatcher ? [beforeUnloadWatcher] : [];
    _skipFocus[_currentDepth] = false;
    _closing[_currentDepth] = false;

    if (replace) {
      history.replaceState(
        {
          currentLocation: location,
          prevLocation: history.state?.prevLocation,
          depth: _currentDepth,
          history: _historyStack,
        },
        '',
        url,
      );
    } else {
      history.pushState(
        {
          currentLocation: location,
          prevLocation: _currentLocation,
          depth: _currentDepth,
          history: _historyStack,
        },
        '',
        url,
      );
    }

    _fromLocation = _currentLocation;
    _currentLocation = location;

    if (options.quiet) {
      return location;
    }

    emitState({
      depth: _currentDepth,
      prev: getPrevLocation(),
      location,
      history: _historyStack,
    });

    emitHistoryDepth(_currentDepth);

    immediateTransition();

    return location;
  },
  50);

  const backLocation = queue((options?: TLocationNavigationOptions | any) => {
    if (_currentDepth < 1) {
      return;
    }

    _quiet = !!options?.quiet;

    return backLocationBase();
  });

  const backToDepth = queue(async (targetDepth: number, options?: TLocationNavigationOptions) => {
    targetDepth = Math.max(0, targetDepth);

    const quiet = !!options?.quiet;
    const lastQuietDepth = targetDepth + 1;

    let quietNext = false;
    let response: TBackLocationResponse = {
      locked: true,
    };

    while (_currentDepth > targetDepth) {
      quietNext = _currentDepth > lastQuietDepth;
      _quiet = quiet || quietNext;
      response = await backLocationBase();
      if (response.locked) {
        if (!quiet && quietNext) {
          immediateTransition();
        }
        break;
      }
    }

    return response;
  });

  const backRepeat = (count: number, options?: TLocationNavigationOptions) =>
    backToDepth(_currentDepth - count, options);

  const backToStart = (options?: TLocationNavigationOptions) => backToDepth(0, options);

  window.addEventListener('popstate', async (e: PopStateEvent) => {
    if (_skipPop > 0) {
      _skipPop--;
      return;
    }
    const [start, finish]: TBackStackItem = _backStack.shift() || [noop, noop];
    start();

    const state = e.state || {};

    const originCurrentDepth = state.depth || 0;
    const originCurrentLocation = parseLocation();

    let currentDepth = originCurrentDepth;
    let currentLocation = originCurrentLocation;

    const prevDepth = _currentDepth;
    const prevLocation = _currentLocation;

    const differenceDepth = prevDepth - currentDepth;
    const isBack = differenceDepth > 0;

    /*
      Костыль, который исправляет баг браузера с проскакиванием страниц истории при
      переходе назад
      Если перешагнули страницы, то идём вперёд до страницы с целевым индексом
    */
    const historyCurrentDepth = prevDepth - 1;
    const historyCurrentLocation = _historyStack[historyCurrentDepth];
    if (differenceDepth > 1 && historyCurrentLocation) {
      const stateCurrentDepth = currentDepth;
      currentDepth = historyCurrentDepth;
      currentLocation = historyCurrentLocation;

      for (let depth = stateCurrentDepth; depth < currentDepth; depth++) {
        const _currentLocation = _historyStack[depth];
        history.pushState(
          {
            prevLocation: _historyStack[depth - 1],
            currentLocation: _currentLocation,
            depth,
            history: _historyStack,
          },
          '',
          _currentLocation.href,
        );
        await waitTransition();
      }
    }

    const onBeforeUnload = _historyStackBeforeUnload[prevDepth].filter(isBack ? (v) => v.backwards : (v) => v.forwards);

    _closing[prevDepth] = true;
    if (onBeforeUnload.length) {
      _skipFocus[prevDepth] = true;

      if (isBack) {
        history.pushState(
          {
            prevLocation: state.prevLocation,
            currentLocation: prevLocation,
            depth: prevDepth,
            history: _historyStack,
          },
          '',
          prevLocation.href,
        );
      } else {
        _skipPop++;
        history.back();
      }

      const lockedFinish = once(() => {
        finish({
          locked: true,
        });

        return waitTransition() as Promise<void>;
      });

      let result = true;

      _finishCallbacks.push(lockedFinish);

      for (const onBeforeUnloadItem of onBeforeUnload) {
        let iterationResult = onBeforeUnloadItem.callback(prevLocation);

        if (isPromise(iterationResult)) {
          iterationResult = await iterationResult;
        }

        if (iterationResult === false) {
          result = false;
          break;
        }
      }

      _closing[prevDepth] = false;

      if (result === false) {
        lockedFinish();
        _skipFocus[prevDepth] = false;
        emitHistoryDepth(prevDepth);
        return;
      }

      await waitTransition();
      _historyStackBeforeUnload[prevDepth] = [];

      if (isBack) {
        await backLocationBase();
      } else {
        await pushLocation(originCurrentLocation);
      }

      finish({
        locked: false,
      });
      return;
    }

    _currentDepth = currentDepth;
    _fromLocation = prevLocation;
    _currentLocation = currentLocation;

    emitState({
      depth: currentDepth,
      prev: state.prevLocation,
      location: currentLocation,
      history: _historyStack,
    });

    _skipFocus[_currentDepth] || emitHistoryDepth(_currentDepth);

    _closing[prevDepth] = false;

    _quiet || immediateTransition();

    _quiet = false;

    finish({
      locked: false,
    });
  });

  function backLocationBase() {
    return new Promise<TBackLocationResponse>((resolve) => {
      let started = false;

      _backStack.push([() => {
        started = true;
      }, resolve]);

      base();

      function base() {
        history.back();

        /*
          Костыль.
          Таймаут для повтороной попытки перехода назад, если предыдущая не прошла
        */
        setTimeout(() => {
          started || base();
        }, 500);
      }
    });
  }

  function immediateTransition() {
    emitTransition($state.getState());
  }

  function getHistory(): TUrlProps[] {
    const state = history.state || {};
    const orignHistory = state.history || [];
    const depth: number = state.depth || 0;
    const historyLength = depth + 1;
    const historyItems = new Array(historyLength);

    const currentLocation = parseLocation();

    let loc = currentLocation;
    for (let i = 0; i < historyLength; i++) {
      loc = orignHistory[i] || loc;
      historyItems[i] = loc;
    }

    historyItems[depth] = currentLocation;

    return historyItems;
  }
  function getCurrentLocation() {
    return _currentLocation;
  }
  function getCurrentHashLocation() {
    return getCurrentLocation().child;
  }
  function getPrevLocation() {
    return history.state?.prevLocation;
  }
  function getNextLocation() {
    return _historyStack[_currentDepth + 1];
  }
  function getFromLocation() {
    return _fromLocation;
  }
  function getPrevHashLocation() {
    return getPrevLocation()?.child;
  }
  function getNextHashLocation() {
    return getNextLocation()?.child;
  }
  function getFromHashLocation() {
    return getFromLocation()?.child;
  }
  function parseLocation() {
    return urlParse(location.href);
  }
  function pushLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    console.log(
      'pushLocation', extendsLocation, options,
    );
    return changeLocation(mergeLocation(_currentLocation, extendsLocation), options);
  }
  function storagePushLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(urlExtend(_currentLocation, extendsLocation), options);
  }
  function replaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      mergeLocation(_currentLocation, extendsLocation), options, 1,
    );
  }
  function storageReplaceLocation(extendsLocation: Partial<TUrlProps>, options?: TLocationOptions) {
    return changeLocation(
      urlExtend(_currentLocation, extendsLocation), options, 1,
    );
  }
  function pushHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return pushLocation({
      child,
    },
    options);
  }
  function storagePushHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return storagePushLocation({
      child,
    },
    options);
  }
  function storageReplaceHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return storageReplaceLocation({
      child,
    },
    options);
  }
  function replaceHashLocation(child: Partial<TUrlProps>, options?: TLocationOptions) {
    return replaceLocation({
      child,
    },
    options);
  }

  function isTryClosingLocation(depth: number) {
    return !!_closing[depth];
  }

  function isWaitingUnloadLocation(depth: number) {
    return _historyStackBeforeUnload[depth].length > 0;
  }

  function isTryClosingCurrentLocation() {
    return isTryClosingLocation(_currentDepth);
  }

  function isWaitingUnloadCurrentLocation() {
    return isWaitingUnloadLocation(_currentDepth);
  }

  function onBeforeUnload(callback: TLockWatcherFn, options?: TLockWatcherOptions) {
    let watcher: TLockWatcher | null = {
      ...DEFAULT_LOCK_WATCHER_OPTIONS,
      ...options,
      callback,
    };
    const depth = _currentDepth;
    _historyStackBeforeUnload[depth].push(watcher);
    return () => {
      const items = _historyStackBeforeUnload[depth];
      if (watcher && items?.length) {
        _historyStackBeforeUnload[depth] = items.filter((fn) => fn !== watcher);
        watcher = null;
      }
    };
  }

  function LinkProvider({
    pushLocation,
    hasHash,
  }: {
    pushLocation: TPushLocation;
    hasHash?: boolean | number;
  }): TElementType {
    return forwardRef((props: TLinkProps, ref: any) => {
      const {
        options: _originOptions,
        component,
        timeout,
        activeAsParent,
        active,
        ...addition
      } = props;

      const onClick: any = props.onClick || noop;
      const options = urlExtend(props.href, _originOptions);
      const url = options.href;

      addition.href = url ? (hasHash ? `#${url}` : url) : undefined;
      addition.ref = ref;
      addition.onClick = async (e: any) => {
        e.preventDefault && e.preventDefault();
        if (_hasDurationLink || props.active) {
          return false;
        }

        _hasDurationLink = true;

        const timeout = props.timeout || 0;

        if (timeout) {
          await wait(timeout);
        }

        if ((await onClick(e)) === false) {
          return;
        }

        if (url) {
          await pushLocation(options);
        }

        _hasDurationLink = false;
        return false;
      };

      return createElement(props.component || 'a',
        addition);
    });
  }
  function NavLinkProvider(Link: TElementType, $location: Observable<any>): TElementType {
    return childClassOfReact(Component, (self) => {
      let subscription: (() => any) | 0;
      const setState = self.setState.bind(self);
      self.state = $location.getState();
      self.componentWillMount = () => {
        subscription || (subscription = $location.watch(setState));
      };
      self.componentWillUnmount = () => {
        subscription && (subscription(), subscription = 0); // eslint-disable-line
      };
      self.render = () => {
        const props = extend({}, self.props);
        const forwardedRef = props.forwardedRef;
        const {
          state, 
        } = self;
        const path = state.path || '/';
        const matchs = urlExtend(props.href, props.options);
        const targetPath = matchs.path;
        const hasActive = path === targetPath && isMatch(state.query, matchs.query);

        if (forwardedRef) {
          delete props.forwardedRef;
          props.ref = forwardedRef;
        }

        if (
          hasActive ||
          (props.activeAsParent &&
            path.startsWith(targetPath.slice(-1) === '/' ? targetPath : targetPath + '/'))
        ) {
          props.active = hasActive;
          props.className = 'active ' + (props.className || '');
        }

        return createElement(Link, props);
      };
    }) as any;
  }

  function paramStorageProvider($query: Observable<TParams>, pushLocation: TPushLocation) {
    const $params = createObservable({});
    const {
      emit, 
    } = createApi($params, {
      emit: (_, payload: Record<string, any>) => payload,
    });

    let state = $query.getState();

    const instance = {
      set,
      get: (key: string) => state[key],
      remove: (key: string) => set(key),
      getKeys: () => Object.keys(state),
      clear: () => {
        setState({});
        return instance;
      },
      watch: (watcher: (state: Record<string, any>) => any) => $params.watch(watcher),
    };

    function setState(query: Record<string, any>) {
      _locked = 1;
      pushLocation({
        query, 
      });
      changeState(query);
      _locked = 0;
    }
    function set(key: string, v?: any) {
      if (!isEqual(v, state[key])) {
        const nextState: Record<string, any> = {
          ...state, 
        };
        nextState[key] = v;
        setState(nextState);
      }
      return instance;
    }
    function changeState(nextState: Record<string, any>) {
      const prev = state;
      const exclude: Record<string, any> = {};
      const changed: Record<string, any> = {};
      let v: any, k: string;
      state = nextState;
      for (k in state) { // eslint-disable-line
        exclude[k] = 1;
        isEqual(prev[k], (v = state[k])) || (changed[k] = v);
      }
      for (k in prev) {
        exclude[k] || isEqual(prev[k], (v = state[k])) || (changed[k] = v);
      }
      for (k in changed) {
        emit({
          key: k,
          value: changed[k],
        });
      }
    }
    $query.watch((state) => {
      _locked || changeState(state || {});
    });
    return instance;
  }

  const useRouteIsFocus = (effect: TEffectCallback, deps?: TDependencyList) => {
    const freezeDepth = $historyDepth.getState();
    (useEffect as any)(() => {
      let _cancel: any = noop;
      let _isClosing = true;

      return $historyDepth.watch((depth) => {
        const isClosing = isTryClosingLocation(freezeDepth);
        if (_isClosing === isClosing) {
          return;
        }
        _isClosing = isClosing;
        if (_isClosing) {
          _cancel();
          _cancel = noop;
        } else {
          if (freezeDepth === depth) {
            const fn = effect();
            isFunction(fn) && (_cancel = fn);
          }
        }
      });
    }, deps || []);
  };

  return {
    $historyDepth,
    $trasitionState,
    $trasitionStateHash,
    $state,
    $stateHash,
    $location,
    $query,
    $path,
    $hashLocation,
    $hashQuery,
    $hashPath,

    $immeidateLocation,
    $immeidateQuery,
    $immeidatePath,
    $immeidateHashLocation,
    $immeidateHashQuery,
    $immeidateHashPath,

    $prevLocation,
    $prevQuery,
    $prevPath,
    $prevHashLocation,
    $prevHashQuery,
    $prevHashPath,

    LinkProvider,
    routerForObservableMapProvider,
    paramStorageProvider,
    routerByLocationProvider: routerByLocationProviderProvider($trasitionState),
    routerByHashLocationProvider: routerByLocationProviderProvider($trasitionStateHash as any),
    paramStorage: paramStorageProvider($query, storagePushLocation),
    hashParamStorage: paramStorageProvider($hashQuery, storagePushHashLocation),
    paramReplaceStorage: paramStorageProvider($query, storageReplaceLocation),
    hashParamReplaceStorage: paramStorageProvider($hashQuery, storageReplaceHashLocation),
    Link,
    NavLink,
    HashLink,
    HashNavLink,
    getHistory,
    getCurrentLocation,
    getCurrentHashLocation,
    getPrevLocation,
    getNextLocation,
    getFromLocation,
    getPrevHashLocation,
    getNextHashLocation,
    getFromHashLocation,
    pushLocation,
    replaceLocation,
    pushHashLocation,
    replaceHashLocation,
    storagePushLocation,
    storagePushHashLocation,
    storageReplaceLocation,
    storageReplaceHashLocation,
    backLocation,
    backToDepth,
    backRepeat,
    backToStart,
    isTryClosingLocation,
    isWaitingUnloadLocation,
    isTryClosingCurrentLocation,
    isWaitingUnloadCurrentLocation,
    onBeforeUnload,

    useRouteIsFocus,
  };
}

function debounceLocation<A extends any[]>(callback: (...args: A) => Promise<void> | void) {
  let _debounced = false;
  return async (...args: Parameters<typeof callback>) => {
    if (_debounced) {
      return;
    }
    _debounced = true;
    await Promise.all([wait(300), callback(...args)]);
    _debounced = false;
  };
}

export function routerProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps);
  const {
    pushLocation,
    replaceLocation,
  } = instance;


  return {
    ...instance,
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: debounceLocation(pushLocation),
    replaceLocationThrottled: debounceLocation(replaceLocation),
    backLocationThrottled: debounceLocation(instance.backLocation),
  };
}

export function hashRouterProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps);
  const {
    pushHashLocation: pushLocation,
    replaceHashLocation: replaceLocation,
  } = instance;

  return {
    ...instance,
    Link: instance.HashLink,
    NavLink: instance.HashNavLink,
    $prevLocation: instance.$prevHashLocation,
    $location: instance.$hashLocation,
    $path: instance.$hashPath,
    $query: instance.$hashQuery,
    $immeidateQuery: instance.$immeidateHashQuery,
    paramStorage: instance.hashParamStorage,
    paramReplaceStorage: instance.hashParamReplaceStorage,
    routerByLocationProvider: instance.routerByHashLocationProvider,
    pushLocation,
    replaceLocation,
    getCurrentLocation: instance.getCurrentHashLocation,
    getPrevLocation: instance.getPrevHashLocation,
    getNextLocation: instance.getNextHashLocation,
    getFromLocation: instance.getFromHashLocation,
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: debounceLocation(pushLocation),
    replaceLocationThrottled: debounceLocation(replaceLocation),
    backLocationThrottled: debounceLocation(instance.backLocation),
  } as TRouter;
}

export type TRouterProvider = typeof routerProvider;
export type TRouter = ReturnType<TRouterProvider>;