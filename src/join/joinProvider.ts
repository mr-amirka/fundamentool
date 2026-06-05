const NATIVE_JOIN = [].join;

/**
 * Creates join helper for fixed delimiter.
 * 
 * @param delimiter - The delimiter to join the items with.
 * @returns The join provider.
 * @example
 * joinProvider('.')(['a', 'b', 'c']) // => 'a.b.c'
 */
export const joinProvider = (delimiter: string): ((src: any[]) => string) => {
  return (src: any[]): string => NATIVE_JOIN.call(src, delimiter);
};
