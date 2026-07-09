import {
  setBase, 
} from './set';

/**
 * A function that maps an array of values to a record.
 * 
 * @param keys - The keys to map the values to.
 * @param values - The values to map.
 * @param dst - The destination record to map the values to.
 * @returns The mapped record.
 * @example
 * const mapper = mapperProvider([ 'name', 'age']);
 * mapper([ 'Вася', 30 ]) //=> {name: 'Вася', age: 30}
 */
export type TMapper = (values?: any[], dst?: Record<string, any>) => Record<string, any>;

/**
 * Creates a new mapper provider.
 * 
 * @param keys - The keys to map the values to.
 * @returns The mapper provider.
 */
export const mapperProvider = (keys: string[]): TMapper => {
  const length = keys.length;
  const paths = keys.map((key) => key.split('.'));
  return (values?: any[], dst?: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = dst || {};
    if (!values) {
      return result;
    }
    let i = 0;
    let v: any;
    for (; i < length; i++) {
      v = values[i];
      if (v !== undefined) {
        setBase(
          result, paths[i], v,
        );
      }
    }
    return result;
  };
};