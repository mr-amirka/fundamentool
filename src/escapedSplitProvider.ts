import {
  regexpNormalizeText, 
} from './regexpNormalizeText';
import {
  unslash, 
} from './unslash';
import {
  map, 
} from './map';
import {
  joinOnly, 
} from './join/joinOnly';

/**
 * A splitter that respects escaped separators.
 */
interface IEscapedSplit {
  /**
   * Splits the input string into an array of strings.
   * 
   * @param input - The input string to split.
   * @param dstSeparators - The destination separators.
   * @returns The array of strings with escaped fragments.
   */
  (input: string, dstSeparators?: string[]): string[];

  /**
   * Splits the input string into an array of strings without escaped fragments.
   * 
   * @param input - The input string to split.
   * @param dstSeparators - The destination separators.
   * @returns The array of strings without escaped fragments.
   */
  base: (input: string, dstSeparators?: string[]) => string[];
}

/**
 * Creates a splitter that respects escaped separators.
 *
 * @param separator - The separator to use.
 * @param escaped - The escaped string.
 * @returns The splitter that respects escaped separators.
 * @example
 * const split = escapedSplitProvider(',');
 * split('a,b,c');       // => ['a', 'b', 'c']
 * split('a\\,b,c');     // => ['a,b', 'c']
 */
export const escapedSplitProvider = (separator: string,
  escaped?: string): IEscapedSplit => {
  const sep = regexpNormalizeText(separator);
  const esc = escaped ? regexpNormalizeText(escaped) : '\\\\.';
  const regexp = new RegExp('(' + esc + ')|(' + sep + ')', 'g');

  function escapedSplit(input: string, dstSeparators?: string[]): string[] {
    return map(base(input, dstSeparators), unslash) as string[];
  }

  const base = escapedSplit.base = (input: string, dstSeparators?: string[]): string[] => {
    let lastOffset = 0;
    let v: string[] = [];
    const output: string[] = [];

    input.replace(regexp, (
      all, escapedMatch, separatorMatch, offset: number,
    ) => {
      v.push(input.slice(lastOffset, offset));
      if (escapedMatch) {
        v.push(escapedMatch);
      } else {
        if (dstSeparators) {
          dstSeparators.push(separatorMatch);
        }
        output.push(joinOnly(v));
        v = [];
      }
      lastOffset = offset + all.length;
      return '';
    });

    v.push(input.slice(lastOffset));
    output.push(joinOnly(v));
    return output;
  };

  return escapedSplit;
};
