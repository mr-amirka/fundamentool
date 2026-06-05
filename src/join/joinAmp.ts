import { joinProvider } from './joinProvider';

/**
 * Joins array items with ampersand.
 * 
 * @param items - The items to join.
 * @returns The joined string.
 * @example
 * joinAmp(['a', 'b', 'c']) // => 'a&b&c'
 * joinAmp(['hello']) // => 'hello'
 */
export const joinAmp: (items: any[]) => string = joinProvider('&');
