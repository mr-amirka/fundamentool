import {
  merge, 
} from './merge';

/**
 * Builds a tree structure from flat array of items with `id` and `parent` fields.
 * 
 * @param src - The source array of items.
 * @param id - The id of the parent item.
 * @param dst - The destination array.
 * @param depth - The depth of the tree.
 * @returns The tree structure.
 */
const base = (
  src: Array<{ id?: any;
    parent?: any }> | null | undefined,
  id: any,
  dst: any[],
  depth: number,
): any[] => {
  if (!src) {
    return dst;
  }
  const length = src.length;
  let i = 0;
  let item: any;
  let itemId: any;
  depth--;
  for (; i < length; i++) {
    item = src[i];
    if (item && item.parent == id) {
      itemId = item.id;
      dst.push(depth > 0
        ? merge([item, {
          childs: itemId ? base(
            src, itemId, [], depth,
          ) : [], 
        }])
        : item);
    }
  }
  return dst;
};

/**
 * Builds a tree structure from flat array of items with `id` and `parent` fields.
 *
 * @param src - The source array of items.
 * @param id - The id of the parent item.
 * @param dst - The destination array.
 * @param depth - The depth of the tree.
 * @returns The tree structure.
 * @example
 * const items = [
 *   { id: 1, parent: null },
 *   { id: 2, parent: 1 },
 *   { id: 3, parent: 1 },
 * ];
 * getTree(items, null);
 * // => [{ id: 1, parent: null, childs: [{ id: 2, ... }, { id: 3, ... }] }]
 */
export const getTree = (
  src: Array<{ id?: any;
    parent?: any }> | null | undefined,
  id: any,
  dst?: any[],
  depth: number = 10,
): any[] => {
  return base(
    src || [], id, dst || [], depth,
  );
};

