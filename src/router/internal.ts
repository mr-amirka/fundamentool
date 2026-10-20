// What a router hands to the navigator over it and to nobody else: its part of the history and its steps
// (fundamentool D-041 — plumbing, not the router's API).
import {
  isObject,
} from '../is/isObject';
import type {
  TUrlProps,
} from '../urlParse';
import type {
  TBackOptions,
  THistoryPrimitive,
  TRouter,
} from './types';

/** The key the router keeps its plumbing under; not exported from the package. */
export const ROUTER_INTERNAL: unique symbol = Symbol('fundamentool router');

/** How a router's steps are carried out: by the primitive, or by a navigator over it. */
export type TRouterDriver = {
  push(location: TUrlProps): Promise<void>;
  replace(location: TUrlProps): Promise<void>;
  back(options?: TBackOptions): Promise<boolean>;
};

/** A router's plumbing. */
export type TRouterInternal = {
  /** The part the router works in. */
  historyPrimitive: THistoryPrimitive;
  /** Hands the router's steps to `driver`; returns how the driver shows a location it moved to. One per router. */
  attach(driver: TRouterDriver): (location: TUrlProps) => void;
};

/** A router as `createRouter` makes it. */
export type TRouterWithInternal = TRouter & {
  [ROUTER_INTERNAL]: TRouterInternal;
};

/**
 * The plumbing of a router made by `createRouter`; `undefined` for anything else.
 *
 * @example
 * const internal = routerInternal(deps.router);
 * const show = internal.attach(driver);
 */
export function routerInternal(router: unknown): TRouterInternal | undefined {
  return isObject(router) ? (router as Partial<TRouterWithInternal>)[ROUTER_INTERNAL] : undefined;
}
