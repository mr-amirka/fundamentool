// A route table matched to an address (`ROUTE_ARGS` → the row and its params).
import {
  isFunction,
} from '../is/isFunction';
import {
  routeParseProvider,
} from '../routeParseProvider';
import {
  wrapper,
} from '../wrapper';
import type {
  TRouteMapper,
} from '../regexpMapperProvider';
import type {
  TParams,
} from '../unparam';
import type {
  TRoute,
  TRouteArgs,
  TRouteHandler,
  TRouterState,
} from './types';

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
    // `-` and `_` match each other in the plain part of a route, before its first group — never inside the group.
    let scopePos = route.indexOf('(');
    const length = route.length;
    if (scopePos < 0) {
      scopePos = length;
    }

    const handler = (isFunction(render) ? render : wrapper(render)) as TRouteHandler<T>;

    return [
      routeParseProvider(route.slice(0, scopePos).replace(/[-_]/gim, '[-_]') + route.slice(scopePos, length)),
      handler,
    ];
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
