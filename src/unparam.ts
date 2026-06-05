import { tryJsonParse } from './tryJsonParse';
import { half } from './half';
import { set } from './set';

const REGEXP_SPACE = /\+/g;

export type TParams = Record<string, any>;

export const unparamBase = (query: string, output?: any): TParams => {
  const parts = half(query, '?', 1)[1].split('&');
  const length = parts.length;
  let result = output;

  if (length < 1) {
    return result || {};
  }
  
  let halfParts: [string, string, string];
  let value: string;
  let normalizedValue: string;
  let i = 0;

  for (; i < length; i++) {
    halfParts = half(parts[i], '=');
    value = halfParts[1];
    normalizedValue = tryJsonParse(decodeURIComponent(value.replace(REGEXP_SPACE, ' ')));
    result = set(
      result,
      halfParts[0],
      typeof normalizedValue === 'number' ? normalizedValue : value
    );
  }

  return result;
};

/**
 * Parses a URL query string into a key-value object.
 *
 * Supports nested keys via dot notation. Values that look like JSON are parsed automatically.
 *
 * @param query - Query string, optionally including the leading `?`.
 * @returns Parsed parameters object.
 * @example
 * unparam('?a=1&b=hello'); // => { a: '1', b: 'hello' }
 * unparam('x.y=2');        // => { x: { y: 2 } }
 */
export const unparam = (query: string): TParams => unparamBase(query);
