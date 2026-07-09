import {
  isFunction, 
} from './is/isFunction';
import {
  noopHandle, 
} from './noopHandle';

type CompareFn = (v: any, w: any) => boolean;

const byMax: CompareFn = (v, w) => v > w;
const byMin: CompareFn = (v, w) => v < w;

const normalizeCompare = (compare?: CompareFn | boolean | null): CompareFn =>
  isFunction(compare) ? (compare as CompareFn) : compare ? byMax : byMin;

/**
 * Returns only one item from collection by applying comparator to iteratee result.
 * 
 * @param collection - The collection to search in.
 * @param iteratee - The iteratee to apply to each item.
 * @param compare - The comparator to use.
 * @returns The only item from the collection.
 * @example
 * onlyBy([1, 2, 3], (item) => item, (v, w) => v > w); // => 3 
 */
export const onlyBy = (
  collection: ArrayLike<any>,
  iteratee: (item: any, index: number, collection: ArrayLike<any>) => any = noopHandle,
  compare?: CompareFn | boolean | null,
): any => {
  const length = collection?.length || 0;
  const _compare = normalizeCompare(compare);
  let value: any;
  let item: any;
  let tmpItem: any;
  let tmpValue: any;
  let i = 0;
  
  for (; i < length; i++) {
    tmpItem = collection[i];
    tmpValue = iteratee(
      tmpItem, i, collection,
    );
    if (!item || _compare(tmpValue, value)) {
      item = tmpItem;
      value = tmpValue;
    }
  }

  return item;
};

/**
 * Returns only one item from collection by applying comparator to iteratee result.
 * 
 * @param collection - The collection to search in.
 * @param iteratee - The iteratee to apply to each item.
 * @param compare - The comparator to use.
 * @returns The only item from the collection.
 * @example
 * onlyByIn({ a: 1, b: 2, c: 3 }, (item) => item, (v, w) => v > w); // => 3 
 */
export const onlyByIn = (
  collection: Record<string, any>,
  iteratee: (item: any, key: string, collection: Record<string, any>) => any = noopHandle,
  compare?: CompareFn | boolean | null,
): any => {
  const _compare = normalizeCompare(compare);
  let value: any;
  let item: any;
  let tmpItem: any;
  let tmpValue: any;
  let k: string;

  for (k in collection) {
    tmpItem = collection[k];
    tmpValue = iteratee(
      tmpItem, k, collection,
    );
    if (!item || _compare(tmpValue, value)) {
      item = tmpItem;
      value = tmpValue;
    }
  }

  return item;
};