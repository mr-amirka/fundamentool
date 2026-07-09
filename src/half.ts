/**
 * Creates a half provider.
 * 
 * @param indexOf - The index of the separator.
 * @returns The half provider.
 */
export const halfProvider = (indexOf: (input: string) => number): ((input: string, separator: string, right?: boolean | number) => [string, string, string]) => {
  return (
    input: string, separator: string, right?: boolean | number,
  ): [string, string, string] => {
    const i = indexOf.call(input, separator);
    return i < 0
      ? right ? [
        '',
        input,
        '',
      ] : [
        input,
        '',
        '',
      ]
      : [
        input.slice(0, i),
        input.slice(i + separator.length),
        separator,
      ];
  };
};

/**
 * Splits a string into two parts by the **first** occurrence of the separator.
 *
 * @param input - The input string to split.
 * @param separator - The separator to split the string by.
 * @param right - If truthy and separator is absent, returns `['', input, '']` instead of `[input, '', '']`.
 * @returns Tuple `[before, after, matchedSeparator]`.
 * @example
 * half('a=b=c', '=');        // => ['a', 'b=c', '=']
 * half('no-sep', ':');       // => ['no-sep', '', '']
 */
export const half = halfProvider(''.indexOf);

/**
 * Splits a string into two parts by the **last** occurrence of the separator.
 *
 * @param input - The input string to split.
 * @param separator - The separator to split the string by.
 * @param right - If truthy and separator is absent, returns `['', input, '']`.
 * @returns Tuple `[before, after, matchedSeparator]`.
 * @example
 * halfLast('a=b=c', '=');    // => ['a=b', 'c', '=']
 */
export const halfLast = halfProvider(''.lastIndexOf);
