// Query parameters as a store: get / set / remove, with change events per key.
import {
  isEqual,
} from '../is/isEqual';
import type {
  Observable,
} from '../Observable/types';
import type {
  TParams,
} from '../unparam';
import {
  keys,
} from '../keys';
import type {
  TPushLocation,
  TRouterProviderDeps,
} from './types';

/**
 * Param storages of one router: the query's keys as a key-value store (`set` / `get` / `remove`, a change event per
 * key). The storages of a router share one lock, so a change one of them makes isn't echoed back to it.
 */
export function createParamStorageProvider({
  createObservable,
  createApi,
}: Pick<TRouterProviderDeps, 'createObservable' | 'createApi'>) {
  let _locked = 0;
  return function paramStorageProvider($query: Observable<TParams>, pushLocation: TPushLocation) {
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
      getKeys: () => keys(state),
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
  };
}
