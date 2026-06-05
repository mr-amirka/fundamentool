import { isDefined } from "./is/isDefined";

const REXGEXP_SIGN = /^(-)(.+)$/;
// const REXGEXP_SPACE = /[^0-9.-]/g;
const REXGEXP_SPACE = /\s+/g;
const REXGEXP_DOT = /^(.*)\.(.*?)$/;
const REXGEXP_DOTS = /\./g;

interface INumParse {
  /**
   * Parses a number string.
   * 
   * @param num - The number string to parse.
   * @returns The parsed number.
   * @example
   * numParse('42') // => 42
   * numParse('-3.14') // => -3.14
   */
  (num: any): number | null;

  /**
   * Parses a number string and returns the base parts.
   * 
   * @param num - The number string to parse.
   * @returns The base parts of the number string.
   * @example
   * numParse.base('42') // => ['', '42', '']
   * numParse.base('-3.14') // => ['-', '3', '14']
   */
  base: (num: any) => [string, string, string] | null;
}

/**
 * Parses a number string.
 * 
 * @param num - The number string to parse.
 * @returns The parsed number.
 * @example
 * numParse('42') // => 42
 * numParse('-3.14') // => -3.14
 */
export const numParse: INumParse = (num: any): number | null => {
  const parts = base(num);
  if (!parts) return null;
  const right = parts[2];
  return parseFloat(parts[0] + (parts[1] || '0') + (right ? '.' + right : ''));
};

const base = numParse.base = (num: any): [string, string, string] | null => {
  if (!isDefined(num)) return null;
  let val = '';
  let sign = '';
  let right = '';
  let matched: null | RegExpExecArray = null;
  num && (val = ('' + num).replace(REXGEXP_SPACE, ''));

  if (matched = REXGEXP_SIGN.exec(val)) {
    sign = matched[1];
    val = matched[2];
  }
  if (matched = REXGEXP_DOT.exec(val)) {
    val = matched[1].replace(REXGEXP_DOTS, '');
    right = matched[2];
  }
  return val || right ? [sign, val, right] : null;
};

