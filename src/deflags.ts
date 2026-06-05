import { filterIn } from './filterIn';
import { keys } from './keys';
import { noopHandle } from './noopHandle';

/**
 * Returns an array of keys for which the flag value is truthy.
 * 
 * @param flags - The flags to get the keys for.
 * @returns The keys for which the flag value is truthy.
 * @example
 * deflags({ a: true, b: false, c: 1 }); // => ['a', 'c']
 */
export const deflags = (flags: Record<string, any>): string[] =>
  keys(filterIn(flags, noopHandle));