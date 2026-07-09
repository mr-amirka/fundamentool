import {
  isObject, 
} from './is/isObject';
import {
  getKeyPath, 
} from './getKeyPath';

export interface IRemove {
  /**
   * Removes a property at a dot-separated path from the context object.
   * Mutates and returns the context.
   * 
   * @param ctx - The context object.
   * @param path - The dot-separated path to the property to remove.
   * @returns The context object.
   * @example
   * remove({ a: { b: 1 } }, 'a.b'); // => { a: {} }
   */
  (ctx: any, path: string): any;

  /**
   * Removes a property at a dot-separated path from the context object.
   * Mutates and returns the context.
   * 
   * @param ctx - The context object.
   * @param path - The dot-separated path to the property to remove.
   * @returns The context object.
   */
  base: (ctx: any, path: string[]) => any;
}

export const remove: IRemove = (ctx: any, path: string): any =>
  path ? base(ctx, getKeyPath(path)) : ctx;

const base = remove.base = (ctx: any, path: ArrayLike<string>): any => {
  const length = path.length;
  const lastIndex = length - 1;
  let nested: any = ctx;
  let nextKey = path[0];
  let i = 0;
  let k: string;
  let next: any;

  while (nested && i < lastIndex) {
    k = nextKey;
    nextKey = path[i + 1];
    next = nested[k];
    if (!isObject(next)) {
      return ctx;
    }
    nested = next;
    i++;
  }
  delete nested[nextKey];
};