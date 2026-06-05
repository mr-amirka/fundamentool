import { deflags } from './deflags';
import { joinSpace } from './join/joinSpace';

/**
 * Builds a space‑separated flags string from an object and appends a suffix.
 *
 * @param src - The object to build the flags string from.
 * @param suffix - The suffix to append to the flags string.
 * @returns The flags string.
 * @example
 * deflagsByString({ a: true, b: false, c: true }, 'extra') === 'a c extra'
 */
export const deflagsByString = (
  src: Record<string, any>,
  suffix?: string,
): string => {
  const prefix = joinSpace(deflags(src));
  return suffix ? `${prefix} ${suffix}` : prefix;
};
