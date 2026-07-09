import {
  joinProvider, 
} from './joinProvider';

/**
 * Joins array items with comma.
 * 
 * @param items - The items to join.
 * @returns The joined string.
 * @example
 * joinComma(['a', 'b', 'c']) // => 'a,b,c'
 * joinComma(['hello']) // => 'hello'
 * joinComma([]) // => ''
 */
export const joinComma: (items: any[]) => string = joinProvider(',');

