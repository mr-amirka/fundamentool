import {
  joinProvider, 
} from './joinProvider';

/**
 * Joins array items with space.
 * 
 * @param items - The items to join.
 * @returns The joined string.
 * @example
 * joinSpace(['a', 'b', 'c']) // => 'a b c'
 * joinSpace(['hello']) // => 'hello'
 * joinSpace([]) // => ''
 */
export const joinSpace: (items: any[]) => string = joinProvider(' ');

