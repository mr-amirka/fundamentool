// What entry points over a router take, as schemas (fundamentool D-051): a router, a location. Built on first use
// (`lazy`, lab D-023): only checks in development use them.
import {
  isArray,
} from '../is/isArray';
import {
  isFunction,
} from '../is/isFunction';
import {
  isObject,
} from '../is/isObject';
import {
  custom,
  lazy,
} from '../schema';
import type {
  TRouter,
} from './types';
import type {
  TUrlProps,
} from '../urlParse';

/** A router (`createRouter(…)`): its steps, its history part, the place a navigator attaches. */
export const ROUTER = /*#__PURE__*/ lazy(() => custom<TRouter>((value) => isObject(value)
  && isFunction((value as TRouter).pushLocation)
  && isFunction((value as TRouter).attach)
  && isObject((value as TRouter).historyPrimitive), 'a router (createRouter(…))'));

/** A location or a change of it: `{ path, query, … }`. */
export const LOCATION = /*#__PURE__*/ lazy(() => custom<Partial<TUrlProps>>((value) => isObject(value) && !isArray(value), 'a location ({ path, query, … })'));
