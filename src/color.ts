import {
  lowerFirst,
} from './lowerFirst';

const COMMA = ',';
const ZERO = '0';
const HASH = '#';

const regexpTrimZero = /^0+|0+$/g;
const regexpColor = /^([A-Fa-f0-9]+)(\.[0-9]+)?$/;

const MULTIPLIER = 1.0 / 255;
const MULTIPLIER_ONE = 1.0 / 15;

const SYNONYMS: Record<string, string> = {
  CT: 'currentColor',
  T: 'Transparent',
};

export interface IColor {
  (v: string, alt?: boolean): string[];
  one: (v: string) => number;
  double: (v: string, start: number) => number;
  normalize: (v: string, alpha?: string | null, w?: number, l?: number) => [number, number, number, number];
  base: (rgbaColor: [number, number, number, number], alt?: boolean) => string[];
  rgbStringify: (rgb: number[]) => string;
}

/**
 * Converts a color string to an array of color strings.
 *
 * @param v - The color string to convert.
 * @param alt - Whether to include alternative color strings.
 * @returns An array of color strings.
 * @example
 * color('ff0000');      // => ['#f00']
 * color('ff000080');    // => ['rgba(255,0,0,0.50)']
 * color('CT');          // => ['currentColor']
 * color('T');           // => ['Transparent']
 */
export const color: IColor = (v: string, alt?: boolean): string[] => {
  const synonym = SYNONYMS[v];
  if (synonym) {
    return [synonym];
  }

  // The commonest codes — one, three or six hex digits, no alpha — are already their result, lower-cased and short.
  const l = v.length;
  if (l === 3 || l === 6 || l === 1) {
    const hex = plainHex(v, l);
    if (hex) {
      return [hex];
    }
  }
  const m = regexpColor.exec(v);
  if (m) {
    return base(normalize(m[1], m[2]), alt);
  }

  return [lowerFirst(v)];
};

/**
 * Converts a single color value to a number.
 *
 * @param v - The color value to convert.
 * @returns The converted number.
 */
const one = color.one = (v: string): number => parseInt(v, 16) * MULTIPLIER_ONE;

/**
 * Converts a double color value to a number.
 *
 * @param v - The color value to convert.
 * @param start - The start index of the color value.
 * @returns The converted number.
 */
const double = color.double = (v: string, start: number): number => parseInt(v.slice(start, start + 2), 16) * MULTIPLIER;

/**
 * Normalizes a color string to an array of color values.
 *
 * @param v - The color string to normalize.
 * @param alpha - The alpha value to use.
 * @returns An array of color values.
 */
const normalize = color.normalize = (v: string, alpha?: string | null): [number, number, number, number] => {
  const a = alpha ? parseFloat(ZERO + alpha) : 1;
  if (!v) {
    return [
      0,
      0,
      0,
      a,
    ];
  }
  const l = v.length;
  if (l < 2) {
    const x = one(v);
    return [
      x,
      x,
      x,
      a,
    ];
  }
  if (l < 3) {
    const x = one(v[0]);
    return [
      x,
      x,
      x,
      one(v[1]),
    ];
  }
  if (l < 4) {
    return [
      one(v[0]),
      one(v[1]),
      one(v[2]),
      a,
    ];
  }
  if (l < 5) {
    return [
      one(v[0]),
      one(v[1]),
      one(v[2]),
      one(v[3]),
    ];
  }
  if (l < 6) {
    return [
      one(v[0]),
      one(v[1]),
      one(v[2]),
      double(v, 3),
    ];
  }
  if (l < 7) {
    return [
      double(v, 0),
      double(v, 2),
      double(v, 4),
      a,
    ];
  }
  if (l < 8) {
    return [
      double(v, 0),
      double(v, 2),
      double(v, 4),
      one(v[6]),
    ];
  }
  return [
    double(v, 0),
    double(v, 2),
    double(v, 4),
    double(v, 6),
  ];
};

/**
 * Converts a color value to a string.
 *
 * @param rgbaColor - The color value to convert.
 * @param alt - Whether to include alternative color strings.
 * @returns An array of color strings.
 */
const base = color.base = (rgbaColor: [number, number, number, number], alt?: boolean): string[] => {
  const tmp = [
    0,
    0,
    0,
  ];
  let i = 3;
  const alpha = rgbaColor[3];
  while (i--) {
    tmp[i] = Math.round(rgbaColor[i] * 255);
  }
  if (alpha < 1) {
    const v =
      'rgba('
      + tmp.join(COMMA)
      + COMMA
      + (alpha ? alpha.toFixed(2).replace(regexpTrimZero, '') : ZERO)
      + ')';
    return alt ? [
      rgbStringify(tmp),
      v,
    ] : [v];
  }
  return [rgbStringify(tmp)];
};

/**
 * Converts a color value to a string.
 *
 * @param rgb - The color value to convert.
 * @returns The converted string.
 */
const rgbStringify = color.rgbStringify = (rgb: number[]): string => {
  const output = [
    0,
    0,
    0,
  ] as any[];
  let i = 3;
  let oneFlag = 1;
  while (i--) {
    let v = rgb[i].toString(16);
    if (v.length < 2) {
      v = ZERO + v;
    }
    if (v[0] !== v[1]) {
      oneFlag = 0;
    }
    output[i] = v;
  }
  return HASH + (oneFlag ? '' + output[0][0] + output[1][0] + output[2][0] : output.join(''));
};

/**
 * The fast path of {@link color}: a code of one, three or six hex digits as `#rgb` / `#rrggbb` — what the long way
 * (to channels and back) gives, with no arithmetic: `F` → `#fff`, `F00` → `#f00`, `FF0000` → `#f00`, `FF8000` →
 * `#ff8000`.
 *
 * @param v - The code.
 * @param l - Its length: 1, 3 or 6.
 * @returns The colour, or `''` if the code has a character that is not a hex digit.
 */
function plainHex(v: string, l: number): string {
  let i = 0;
  let ch: string;
  for (; i < l; i++) {
    ch = v[i];
    if (!(ch >= ZERO && ch <= '9' || ch >= 'a' && ch <= 'f' || ch >= 'A' && ch <= 'F')) {
      return '';
    }
  }
  const s = v.toLowerCase();
  return l === 1 ? HASH + s + s + s : l === 3 ? HASH + s : s[0] === s[1] && s[2] === s[3] && s[4] === s[5]
    ? HASH + s[0] + s[2] + s[4] : HASH + s;
}
