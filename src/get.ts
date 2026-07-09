import {
  getKeyPath, 
} from './getKeyPath';

/**
 * Gets a value from an object by a dot path string.
 * 
 * @param scope - The object to get the value from.
 * @param path - The dot path string to get the value from.
 * @returns The value, or `null` if the path is not found.
 * @example
 * getWithContext({ a: { b: { c: 42 } } }, ['a', 'b', 'c']) // => [ { c: 42 }, 42 ]
 * getWithContext({ a: { b: { c: 42 } } }, ['a', 'b', '[]']) // => [ { c: 42 }, undefined ]
 * getWithContext({ a: { b: { c: 42 } } }, ['a', 'b', '[]', 'd']) // => [ { c: 42 }, undefined ]
 * getWithContext({ a: [3, 4, 9] }, ['a', '1']) // => [ [3, 4, 9], 4 ]
 * getWithContext({ a: [3, 4, 9] }, ['a', '[]']) // => [ [3, 4, 9], 9 ]
 */
export const getWithContext = (scope: any, path: ArrayLike<string | number>): null | [
  context: any,
  value: any,
] => {
  const length = path.length;
  let i = 0;
  let context: any;
  let value = scope;
  let key: string | number;

  while (value && i < length) {
    key = path[i++];
    if (key === '[]') {
      key = (value.length || 1) - 1;
    }
    context = value;
    value = context[key];
  }

  return i === length ? [context, value] : null;
};

/**
 * Gets a value from an object by a dot path string.
 * 
 * @param scope - The object to get the value from.
 * @param path - The dot path string to get the value from.
 * @returns The value, or `null` if the path is not found.
 * @example
 * getBase({ a: { b: { c: 42 } } }, ['a', 'b', 'c']) // => 42
 * getBase({ a: { b: { c: 42 } } }, ['a', 'b', '[]']) // => undefined
 * getBase({ a: { b: { c: 42 } } }, ['a', 'b', '[]', 'd']) // => undefined
 * getBase({ a: [3, 4, 9] }, ['a', '1']) // => 4
 * getBase({ a: [3, 4, 9] }, ['a', '[]']) // => 9
 */
export const getBase = (scope: any, path: ArrayLike<string | number>): any => getWithContext(scope, path)?.[1];

/**
 * Gets a value from an object by a dot path string.
 * 
 * @param scope - The object to get the value from.
 * @param path - The dot path string to get the value from.
 * @returns The value, or `null` if the path is not found.
 * @example
 * get({ a: { b: { c: 42 } } }, 'a.b.c') // => 42
 * get({ a: { b: { c: 42 } } }, 'a.b.[]') // => undefined
 * get({ a: { b: { c: 42 } } }, 'a.b.[]', 'd') // => undefined
 * get({ a: [3, 4, 9] }, 'a.1') // => 4
 * get({ a: [3, 4, 9] }, 'a[1]') // => 4
 * get({ a: [3, 4, 9] }, 'a[]') // => 9
 */
export const get = (scope: any, path: string | number): any =>
  getBase(scope, getKeyPath('' + path));
