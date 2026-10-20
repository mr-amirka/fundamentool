// The address model: observables of the current, previous and immediate address — the whole location, its path,
// query and hash part — derived from the router's state.
import type {
  Observable,
} from '../Observable/types';
import {
  getChild,
  getPath,
  getQuery,
} from './location';
import type {
  TRouterState,
} from './types';

/**
 * Derives the router's address observables from its two states: `$state` (changes at once) gives the `$immediate…`
 * ones; `$transitionState` (follows the transitions) gives the current (`$location`, `$path`, `$query`, the hash part)
 * and the previous (`$prev…`) ones.
 *
 * @example
 * const address = createAddressModel($state, $transitionState);
 * address.$path.watch((path) => console.log(path));
 */
export function createAddressModel($state: Observable<TRouterState>, $transitionState: Observable<TRouterState>) {
  const $historyDepth = $state.map((value) => value.depth);

  const $transitionStateHash = $transitionState.map((value) => ({
    ...value,
    location: value.location?.child || {},
    prev: value.prev?.child || {},
  }));

  const $prevLocation = $transitionState.map((value) => value.prev || {});
  const $prevQuery = $prevLocation.map(getQuery);
  const $prevPath = $prevLocation.map(getPath);
  const $prevHashLocation = $prevLocation.map(getChild);
  const $prevHashQuery = $prevHashLocation.map(getQuery);
  const $prevHashPath = $prevHashLocation.map(getPath);

  const $location = $transitionState.map((value) => value.location);
  const $query = $location.map(getQuery);
  const $path = $location.map(getPath);
  const $hashLocation = $location.map(getChild);
  const $hashQuery = $hashLocation.map(getQuery);
  const $hashPath = $hashLocation.map(getPath);
  const $immediateLocation = $state.map((value) => value.location);
  const $immediateQuery = $immediateLocation.map(getQuery);
  const $immediatePath = $immediateLocation.map(getPath);
  const $immediateHashLocation = $immediateLocation.map(getChild);
  const $immediateHashQuery = $immediateHashLocation.map(getQuery);
  const $immediateHashPath = $immediateHashLocation.map(getPath);

  return {
    $historyDepth,
    $transitionStateHash,
    $location,
    $query,
    $path,
    $hashLocation,
    $hashQuery,
    $hashPath,
    $immediateLocation,
    $immediateQuery,
    $immediatePath,
    $immediateHashLocation,
    $immediateHashQuery,
    $immediateHashPath,
    $prevLocation,
    $prevQuery,
    $prevPath,
    $prevHashLocation,
    $prevHashQuery,
    $prevHashPath,
  };
}
