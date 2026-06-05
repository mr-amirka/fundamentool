/**
 * Shortens text to the given limit and appends a suffix if truncated.
 * 
 * @param text - The text to shorten.
 * @param limit - The limit to shorten the text to.
 * @param suffix - The suffix to append if the text is truncated.
 * @returns The shortened text.
 * @example
 * textEllipsis('hello world', 5);        // => 'hello...'
 * textEllipsis('hi', 5);                 // => 'hi'
 * textEllipsis('hello world', 5, ' …'); // => 'hello …'
 */
export const textEllipsis = (
  text: unknown,
  limit: number = 12,
  suffix: string = '...',
): string => {
  const _text = text === undefined || text === null ? '' : '' + text;
  return _text.length > limit ? _text.slice(0, limit) + suffix : _text;
};

