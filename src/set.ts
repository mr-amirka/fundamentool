import { isObjectLike } from './is/isObjectLike';
import { isIndex } from './is/isIndex';
import { getKeyPath } from './getKeyPath';
import { isLength } from './is/isLength';

/**
 * Устанавливает значение по строковому пути, разделённому точками.
 * 
 * @param ctx - The context to set the value in.
 * @param path - The path to set the value in.
 * @param value - The value to set.
 * @returns The context.
 * @example
 * const obj: any = {};
 * set(obj, 'user.profile.name', 'Vasya');
 * // obj.user.profile.name === 'Vasya'
 */
export function set(ctx: any, path: string | string[], value: any): any {
  if (!path) return ctx;
  return baseSet(ctx, Array.isArray(path) ? path : getKeyPath('' + path), value);
}

/**
 * Sets a value in a context by a path array.
 * 
 * @param ctx - The context to set the value in.
 * @param path - The path to set the value in.
 * @param value - The value to set.
 * @returns The context.
 */
export function baseSet(ctx: any, path: ArrayLike<string>, value: any): any {
  const lastIndex = path.length - 1;
  const rootKeySlot = getKeySlot(ctx, path[0]);

  let rootNested = ctx;
  let nested = rootNested;
  let nextKeySlot = rootKeySlot;
  let keySlot = nextKeySlot;
  let key: string | number = keySlot[0];
  let next: any;
  let i = 0;
  let child: any;

  if (!isObjectLike(rootNested)) {
    rootNested = rootKeySlot[1] ? [] : {};
    nested = rootNested;
  }

  for (; i < lastIndex; i++) {
    keySlot = nextKeySlot;
    nextKeySlot = getKeySlot(nested, path[i + 1]);

    key = keySlot[0];
    next = nested[key];

    if (isObjectLike(next)) {
      nested = next;
      continue;
    }

    next = nested[key] = nextKeySlot[1] ? [] : {};
    setLength(nested, keySlot[1]);
    nested = next;
  }

  nested[nextKeySlot[0]] = value;
  setLength(nested, nextKeySlot[1]);

  setLength(rootNested, rootKeySlot[1]);

  return rootNested;
}

function setLength(nested: Record<string, any> | ArrayLike<any>, arrayLength?: number | undefined): void {
  if (arrayLength && arrayLength !== nested.length) {
    (nested as any).length = arrayLength;
  }
}

function getKeySlot(nested: any, key: string | number): [
  key: string | number,
  arrayLength?: number | undefined
] {
  const isNewItem = key === '[]';

  if (isNewItem || isIndex(key)) {
    const arrayLength = nested ? nested.length : 0;
    if (isLength(arrayLength)) {
      if (isNewItem) {
        return [arrayLength, arrayLength + 1];
      }
      const index = Number(key);
      const maxLength = index + 1;
      return [index, maxLength > arrayLength ? maxLength : arrayLength];
    }
  }

  return [key];
}
