import {
  regexpNormalizeText, 
} from './regexpNormalizeText';
import {
  unslash, 
} from './unslash';
import {
  map, 
} from './map';

interface IEscapedHalf {
  /**
   * Splits the input string into `[prefix, suffix, value]`
   * where `suffix` starts with the separator and `value` is the tail.
   * Escaped fragments are preserved and unescaped via `unslash`.
   * 
   * @param input - The input string to split.
   * @returns The array of `[prefix, suffix, value]`.
   */
  (input: string): [string, string, string];

  /**
   * Splits the input string into `[prefix, suffix, value]` without escaped fragments.
   * where `suffix` starts with the separator and `value` is the tail.
   * 
   * @param input - The input string to split.
   * @returns The array of `[prefix, suffix, value]` without escaped fragments.
   */
  base: (input: string) => [string, string, string];
}

/**
 * Creates a helper that splits string into `[prefix, suffix, value]`
 * where `suffix` starts with the separator and `value` is the tail.
 * Escaped fragments are preserved and unescaped via `unslash`.
 * 
 * @param separator - The separator to use.
 * @param escaped - The escaped string.
 * @returns The function to split the string.
 * @example
 * const half = escapedHalfProvider(':');
 * half('key:value');        // => ['key', ':value', 'value']
 * half('key\\:name:value'); // => ['key:name', ':value', 'value']
 */
export const escapedHalfProvider = (separator: string,
  escaped?: string): IEscapedHalf => {
  const sep = regexpNormalizeText(separator);
  const esc = escaped ? regexpNormalizeText(escaped) : '\\\\.';
  const regexp = new RegExp('(' + esc + ')|(' + sep + '(.*)$)', 'g');

  function instance(input: string): [string, string, string] {
    return map(base(input), unslash) as [string, string, string];
  }

  /**
   * Splits the input string into `[prefix, suffix, value]`
   * where `suffix` starts with the separator and `value` is the tail.
   * Escaped fragments are preserved and unescaped via `unslash`.
   * 
   * @param input - The input string to split.
   * @returns The split string.
   */
  const base = instance.base = (input: string): [string, string, string] => {
    let prefix = input;
    let value = '';
    let suffix = '';
    input.replace(regexp, (
      all, escapedMatch, _suffix, _value, offset,
    ) => {
      if (!escapedMatch) {
        suffix = _suffix;
        value = _value;
        prefix = input.slice(0, offset);
      }
      return '';
    });
    return [
      prefix,
      suffix,
      value,
    ];
  };

  return instance;
};

