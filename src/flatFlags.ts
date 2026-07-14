import {
  reduce,
} from './reduce';

type TFlagsObject = Record<string, any>;

/**
 * Builds a flat flags object from an array of keys — each key becomes its
 * own top-level property, even if it contains `.` or `[...]`.
 *
 * Unlike {@link flags}, which treats `.`-separated keys as a path for a
 * nested `set()` (`flags(['a.b'])` → `{a: {b: 1}}`), `flatFlags` never
 * interprets the key — it's a plain `dst[key] = 1` assignment. Use this
 * when keys are opaque strings that may contain `.`/`[...]`/other
 * path-like characters and must not be split (CSS selectors, decimal
 * values, file paths, etc).
 *
 * @param items - The array of keys to build the flags object from.
 * @param dst - The destination object to build the flags object into.
 * @returns The flags object.
 * @example
 * flatFlags(['apple', 'ban', 'test.use']);
 * // { apple: 1, ban: 1, 'test.use': 1 }
 * @example
 * flatFlags(['[type=button]', 'abbr[title]']);
 * // { '[type=button]': 1, 'abbr[title]': 1 }
 */
export const flatFlags = (items: string[],
  dst?: TFlagsObject): TFlagsObject => reduce(
  items, reducer, dst || {},
);

const reducer = (dst: TFlagsObject, key: string): TFlagsObject => {
  dst[key] = 1;
  return dst;
};
