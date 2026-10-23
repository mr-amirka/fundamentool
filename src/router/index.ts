// The router (fundamentool D-038, D-039; spec router.md): history primitives → a router per part → a navigator of
// pages and windows over a router.
export type * from './types';
export {
  browserHistoryPrimitivesProvider,
  memoryHistoryPrimitivesProvider,
} from './historyPrimitives';
export {
  createRouter,
} from './createRouter';
export {
  createNavigator,
} from './navigator';
export type {
  TNavigator,
} from './navigator';
export {
  routeTableMatcher,
} from './routeTable';
export type {
  TRouteMatch,
} from './routeTable';
