import type {
  TStore,
} from '../createObservable';
import {
  isFunction,
} from './isFunction';
import {
  isObject,
} from './isObject';

/**
 * Whether `unit` is a store — `getState` + `watch` (fundamentool's or effector's); an event — a function without
 * `getState` — isn't one.
 *
 * @param unit - Any value.
 * @returns `true` for a store.
 * @example
 * isStore(createObservable(0)); // => true
 * isStore(createEvent());       // => false
 */
export function isStore(unit: unknown): unit is TStore {
  return (isObject(unit) || isFunction(unit)) && isFunction((unit as TStore).getState) && isFunction((unit as TStore).watch);
}
