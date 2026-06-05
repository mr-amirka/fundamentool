import { joinProvider } from './joinProvider';

/**
 * Joins array items with dot.
 *
 * @param items - The items to join.
 * @returns The joined string.
 * @example
 * joinDot(['a', 'b', 'c']); // => 'a.b.c'
 * joinDot(['hello']);        // => 'hello'
 */
export const joinDot: (items: any[]) => string = joinProvider('.');
