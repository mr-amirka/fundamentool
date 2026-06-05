export const NATIVE_SPLIT = ''.split;

/**
 * A function that splits a string into an array of strings.
 */
export type TSplitter = (src: string) => string[];

/**
 * Creates a splitter function for the given delimiter.
 * 
 * @param delimiter - The delimiter to split the string by.
 * @returns The splitter function.
 * @example
 * const splitDash = splitProvider('-');
 * splitDash('a-b-c'); // => ['a', 'b', 'c']
 */
export const splitProvider = (delimiter: string | RegExp): TSplitter => {
  return (src: string) => NATIVE_SPLIT.call(src, delimiter as any);
};


