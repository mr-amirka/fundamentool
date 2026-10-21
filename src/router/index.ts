// The router (fundamentool D-038, D-039; spec router.md): history primitives → a router per part → a navigator of
// pages and windows over a router.
export type * from './types';
export {
  browserHistoryPrimitivesProvider,
  memoryHistoryPrimitivesProvider,
} from './historyPrimitives';
export {
  createRouter,
  ROUTER_DEPS_KEYS,
} from './createRouter';
export {
  createNavigator,
  NAVIGATOR_DEPS_KEYS,
  OPEN_OPTION_KEYS,
} from './navigator';
export type {
  TNavigator,
} from './navigator';
export {
  NAVIGATION_HOST_OPTION_KEYS,
} from './navigatorView';
export type {
  TLinkProps,
} from './navigatorView';
export {
  BACK_OPTION_KEYS,
  PARAMS_OPTION_KEYS,
  STEP_OPTION_KEYS,
} from './options';
export {
  routeTableMatcher,
} from './routeTable';
export type {
  TRouteMatch,
} from './routeTable';
