import {
  flags, 
} from './flags';
import {
  splitSpace, 
} from './split/splitSpace';

/**
 * Parses space-separated flags string into an object with `{ key: 1 }`.
 *
 * @param v - Space-separated string of flag names.
 * @param dst - Optional destination object to merge flags into.
 * @returns Object with each flag name mapped to `1`.
 * @example
 * flagsByString('a b c');       // => { a: 1, b: 1, c: 1 }
 * flagsByString('foo bar', {}); // => { foo: 1, bar: 1 }
 */
export const flagsByString = (v: string | null | undefined, dst?: Record<string, any>): Record<string, any> => {
  return flags(splitSpace(v || ''), dst);
};

