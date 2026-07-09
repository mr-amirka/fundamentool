import {
  lowerFirst, 
} from './lowerFirst';

const regexpTrimZero = /^0+|0+$/g;
const regexpColor = /^([A-Fa-f0-9]+)(\.[0-9]+)?$/;
const regexpVar = /^(-)?(--[^;,]+)(,([^;]+))?;?$/;

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

  let m = regexpVar.exec(v);
  if (m) {
    return [(m[1] === '-' ? 'env' : 'var')
      + '(' + m[2] + (m[4] ? ',' + m[4] : '') + ')'];
  }

  m = regexpColor.exec(v) as RegExpExecArray | null;
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
 * @param w - The width of the color value.
 * @param l - The length of the color value.
 * @returns An array of color values.
 */
const normalize = color.normalize = (
  v: string, alpha?: string | null, w?: number, l?: number,
): [number, number, number, number] => {
  const a = alpha ? parseFloat('0' + alpha) : 1;
  if (!v) {
    return [
      0,
      0,
      0,
      a,
    ];
  }
  l = v.length;
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
    l < 8 ? one(v[6]) : double(v, 6),
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
      + tmp.join(',')
      + ','
      + (alpha ? alpha.toFixed(2).replace(regexpTrimZero, '') : '0')
      + ')';
    return alt ? [rgbStringify(tmp), v] : [v];
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
      v = '0' + v;
    }
    if (v[0] !== v[1]) {
      oneFlag = 0;
    }
    output[i] = v;
  }
  return '#' + (oneFlag ? '' + output[0][0] + output[1][0] + output[2][0] : output.join(''));
};