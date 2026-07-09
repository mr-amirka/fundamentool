import {
  withoutEmpty, 
} from './withoutEmpty';

const PARAM_WITHOUT_EMPTY_DEFAULT_DEPTH = 10;

/**
 * Constructs a query string from a given object.
 * 
 * @param v - The object to construct a query string from.
 * @returns The query string.
 * @example
 * param({ a: 1, b: 'x' }); // => 'a=1&b=x'
 */
export const param = (v: any): string => {
  if (v === null || typeof v !== 'object') {
    return '';
  }
  const s: string[] = [];
  let k: any;
  let l: any;
  function paramBuild(p: string, v: any) {
    v = withoutEmpty(v, PARAM_WITHOUT_EMPTY_DEFAULT_DEPTH);
    v === null
      || s.push(paramEscape(p)
          + '='
          + paramEscape(v !== null && typeof v === 'object' ? JSON.stringify(v) : '' + v));
    return s;
  }
  if (Array.isArray(v)) {
    for (k = 0, l = v.length; k < l; k++) {
      paramBuild('' + k, v[k]);
    }
  } else {
    for (k in v) paramBuild(k, (v as any)[k]); // eslint-disable-line
  }
  return s.sort().join('&');
};

/**
 * Escapes a string for use in a query string.
 * 
 * @param v - The string to escape.
 * @returns The escaped string.
 * @example
 * paramEscape('a=1&b=x'); // => 'a%3D1%26b%3Dx'
 * paramEscape('a:1,b:x'); // => 'a%3A1%2Cb%3Ax'
 * paramEscape('a"1,b"x'); // => 'a%221%2Cb%22x'
 * paramEscape('a+1,b+x'); // => 'a%2B1%2Cb%2Bx'
 */
export const paramEscape = (v: string): string => {
  return encodeURIComponent(v)
    .replace(/%20/g, '+')
    .replace(/%22/g, '"')
    .replace(/%3A/g, ':')
    .replace(/%2C/g, ',');
};
