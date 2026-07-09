import {
  toUpper, 
} from './toUpper';

/**
 * Uppercases the first character of a string.
 *
 * @param v - The string to transform.
 * @returns String with first character uppercased.
 * @example
 * upperFirst('hello'); // => 'Hello'
 */
export const upperFirst = (v: string): string => {
  const s = String(v);
  return s ? toUpper(s.substring(0, 1)) + s.substring(1) : s;
};

