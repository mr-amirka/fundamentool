import { isDefined } from './is/isDefined';
import { isEqual } from './is/isEqual';
import type { StoreWritable } from './Store/types';

export type TStorage = {
  watch: (fn: (e: Record<string, any>) => any) => () => void;
  set: (key: string, value: any) => any;
  get: (key: string) => any;
};

type TNormalize<A> = (prev: A | null) => A;

export type TStoreProviderDeps = {
  createStore: <T>(initial: T) => any;
  createApi: (store: any, shape: Record<string, (state: any, payload: any) => any>) => Record<string, (payload: any) => void>;
};

export const storeProvider = (
  { createStore, createApi }: TStoreProviderDeps,
  storage: TStorage,
  originalPrefix?: string,
) => {
  const prefix = originalPrefix || '';

  return <A, B extends TNormalize<A> = TNormalize<A>>(
    originalName: string,
    defaultValue: A | null | TNormalize<A> = null,
    isObjectExtension?: boolean,
  ): StoreWritable<A> => {
    const name = prefix + originalName;
    const defaultValueIsFunc = typeof defaultValue === 'function';
    const normalize: TNormalize<A> = isObjectExtension
      ? defaultValueIsFunc
        ? (v) => ({ ...(defaultValue as B)(v), ...v } as A)
        : (v) => ({ ...defaultValue, ...v } as A)
      : defaultValueIsFunc
        ? (defaultValue as B)
        : (v) => (isDefined(v) ? v as A : defaultValue as A);

    const $store = createStore<A>(normalize(storage.get(name)));
    const { emit } = createApi($store, {
      emit: (_: A, v: A) => v,
    });

    storage.watch((e) => {
      if (e.key === name) emit(normalize(e.value));
    });

    ($store as any).setState = (v: A) => {
      storage.set(name, isEqual(defaultValue, v) ? null : v);
      emit(normalize(v));
    };

    return $store as unknown as StoreWritable<A>;
  };
};
