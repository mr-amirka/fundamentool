import {
  joinProvider, 
} from './joinProvider';

/**
 * Joins array items without any delimiter.
 * 
 * @param items - The items to join.
 * @returns The joined string.
 * @example
 * joinOnly(['a', 'b', 'c']) // => 'abc'
 * joinOnly(['hello']) // => 'hello'
 * joinOnly([]) // => ''
 */
export const joinOnly: (items: any[]) => string = joinProvider('');
