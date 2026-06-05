const REGEXP_SOURCE_FLAGS = /^\/(.*)\/(\w*)$/;

/**
 * Parses a string like "/pattern/flags" into [fullMatch, pattern, flags].
 * 
 * @param v - The string to parse.
 * @returns The parsed result.
 * @example
 * regexpParse('/users/:id'); // => ['/users/:id', 'users/:id', '']
 */
export const regexpParse = (v: string): RegExpExecArray | null => REGEXP_SOURCE_FLAGS.exec(v);
