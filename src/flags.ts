import {
  set, 
} from './set';
import {
  reduce, 
} from './reduce';

type TFlagsObject = Record<string, any>;

/**
 * Builds a nested flags object from an array of dot‑separated keys.
 *
 * If a key may contain `.` or `[...]` that must stay literal (CSS
 * selectors, decimal values, etc), use {@link flatFlags} instead — it
 * never interprets the key as a path.
 *
 * @param flags - The array of dot‑separated keys to build the flags object from.
 * @param dst - The destination object to build the flags object into.
 * @returns The flags object.
 * @example
 * flags(['apple', 'ban', 'test.use']);
 * // {
 * //   apple: 1,
 * //   ban: 1,
 * //   test: { use: 1 }
 * // }
 */
export const flags = (flags: string[],
  dst?: TFlagsObject): TFlagsObject => reduce(
  flags, reducer, dst || {},
);

const reducer = (dst: TFlagsObject, key: string): TFlagsObject => {
  set(
    dst, key, 1,
  );
  return dst;
};

