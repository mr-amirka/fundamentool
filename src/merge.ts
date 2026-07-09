import {
  isPlainObject, 
} from './is/isPlainObject';
import {
  extend, 
} from './extend';
import {
  isObjectLike, 
} from './is/isObjectLike';
import {
  isDefined, 
} from './is/isDefined';


/**
 * Merges an array of values into a single value.
 * 
 * @param mergingSrc - The values to merge.
 * @param dst - The destination object.
 * @param asArray - Whether to treat the mergingSrc as an array.
 * @returns The merged value.
 * @example
 * merge([1, 2, 3]) // => 3
 * merge([{ a: 1 }, { b: 2 }]) // => { a: 1, b: 2 }
 * merge([{ a: 1 }, { b: 2 }], { c: 3 }) // => { c: 3, a: 1, b: 2 }
 * merge([{ a: 1 }, { b: 2 }], { c: 3 }, true) // => [{ c: 3, a: 1 }, { c: 3, b: 2 }]
 */
export const merge = (
  mergingSrc: any[] | any, dst?: any, asArray?: boolean,
): any => {
  if (!isObjectLike(mergingSrc)) {
    return isDefined(dst) ? dst : mergingSrc;
  }

  if (!(asArray || (Array.isArray(mergingSrc)))) {
    return extend(dst || {}, mergingSrc);
  }

  const length = (mergingSrc as any[]).length;
  let last: any;
  let v: any;
  let i = 0;
  let tmp: any = isObjectLike(dst) ? dst : 0;

  for (; i < length; i++) {
    v = (mergingSrc as any[])[i];
    if (isPlainObject(v)) {
      tmp = extend(tmp || {}, v);
    } else if (isDefined(v)) {
      last = v;
    }
  }

  return tmp || last || dst;
};
