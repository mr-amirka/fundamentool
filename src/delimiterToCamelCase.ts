import { toUpper } from './toUpper';

/**
 * Converts a delimited string to camelCase using the given delimiter.
 * 
 * @param value - The string to convert.
 * @param delimiter - The delimiter to use.
 * @returns The camelCase string.
 * @example
 * delimiterToCamelCase('hello_world', '_') === 'helloWorld'
 */
export const delimiterToCamelCase = (value: string, delimiter: string): string => {
  const words = value.split(delimiter);
  const length = words.length;
  let i = 1;
  let word: string;
  for (; i < length; i++) {
    word = words[i];
    words[i] = toUpper(word.substring(0, 1)) + word.substring(1);
  }
  return words.join('');
};
