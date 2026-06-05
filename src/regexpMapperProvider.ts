import { isFunction } from './is/isFunction';
import { mapperProvider } from './mapperProvider';

export type TRouteMapper = (text: string, dst?: Record<string, any>) => boolean;

/**
 * Creates a regexp mapper provider.
 * 
 * @param regexp - The regexp to use.
 * @param keys - The keys to use.
 * @returns The regexp mapper provider.
 * @example
 * const mapper = regexpMapperProvider(/^([^/]*)\/([^/]*)$/, ['all', 'begin', 'end']);
 * const params: any = {};
 *
 * if (mapper('users/id6574334245', params)) {
 *   // values = ['users/id6574334245', 'users', 'id6574334245']
 *   // keys   = ['all', 'begin', 'end']
 *   console.log(params);
 *   // {
 *   //   all: 'users/id6574334245',
 *   //   begin: 'users',
 *   //   end: 'id6574334245',
 *   // }
 * }
 */
export const regexpMapperProvider = (
  regexp: RegExp,
  keys: string[] | ((values: any[], dst?: Record<string, any>) => void),
): TRouteMapper => {
  const mapper = isFunction(keys) ? keys : mapperProvider(keys);
  return (text: string, dst?: Record<string, any>): boolean => {
    const values = regexp.exec(text || '');
    if (!values) return false;
    dst && mapper(values, dst);
    return true;
  };
};
