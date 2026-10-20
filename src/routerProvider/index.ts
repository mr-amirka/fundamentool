// The router (fundamentool D-022…D-037): an address model and a stack of pages and windows in step with the
// browser history — see README.md. This file is its public face: the entry points and what they export; the engine is
// `core.ts`, its parts — the files next to it (README.md § Files).
import {
  withAsyncLock,
} from '../withAsyncLock';
import {
  THROTTLE,
} from './constants';
import {
  routerProviderBase,
} from './core';
import type {
  TRouterProviderDeps,
} from './types';

export type * from './types';
export {
  DEFAULT_LOCK_WATCHER_OPTIONS,
  LEAVE_PAGE_OPTION_KEYS,
  NAVIGATION_HOST_OPTION_KEYS,
  OPEN_OPTION_KEYS,
  ROUTER_DEPS_KEYS,
} from './constants';
export {
  mergeLocation,
} from './location';
export {
  routerForObservableMapProvider,
} from './routeMap';

/**
 * The router over the whole address: path, query and the hash part as a child location (see README).
 *
 * @example
 * const router = routerProvider({ window, Component, useEffect, useState, useRef, createContext, useContext,
 *   createElement, forwardRef, createObservable, createApi });
 * await router.pushLocation({ path: '/notes/3' });
 */
export function routerProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps, false);
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
    pushLocationThrottled: withAsyncLock(pushLocation, THROTTLE),
    replaceLocationThrottled: withAsyncLock(replaceLocation, THROTTLE),
    backLocationThrottled: withAsyncLock(instance.backLocation, THROTTLE),
  };
}

export type TRouterProvider = typeof routerProvider;
export type TRouter = ReturnType<TRouterProvider>;

/**
 * The router over the hash part of the address (`https://game.example/#/level/2`): the hash part is the location —
 * for static hosting and iframes (VK, Telegram, FB Instant). The rest of the address stays as it is.
 */
export function hashRouterProvider(deps: TRouterProviderDeps) {
  const instance = routerProviderBase(deps, true);
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
    $immediateQuery: instance.$immediateHashQuery,
    paramStorage: instance.hashParamStorage,
    paramReplaceStorage: instance.hashParamReplaceStorage,
    pushLocation,
    replaceLocation,
    getCurrentLocation: instance.getCurrentHashLocation,
    getPrevLocation: instance.getPrevHashLocation,
    getNextLocation: instance.getNextHashLocation,
    getFromLocation: instance.getFromHashLocation,
    startOverLocation: instance.startOverHashLocation,
    leavePage: instance.leaveHashPage,
    pushParam: (query: Record<string, any>) => pushLocation({
      query,
    }),
    replaceParam: (query: Record<string, any>) => replaceLocation({
      query,
    }),
    pushLocationThrottled: withAsyncLock(pushLocation, THROTTLE),
    replaceLocationThrottled: withAsyncLock(replaceLocation, THROTTLE),
    backLocationThrottled: withAsyncLock(instance.backLocation, THROTTLE),
  } as TRouter;
}
