const NATIVE_PUSH = ([] as any[]).push;

export interface IColorRange {
  (colors: Array<[number, number, number, number]>, precision: number): string[];
  base: (input: Array<[number, number, number, number]>, precision: number) => Array<[number, number, number, number]>;
  rgba: (rgbaColor: [number, number, number, number]) => string;
}

/**
 * Converts an array of colors to an array of strings.
 * 
 * @param colors - The array of RGBA colors `[r, g, b, a]` (each 0–1).
 * @param precision - Number of interpolation steps between each pair of colors.
 * @returns Array of `rgba(...)` strings.
 * @example
 * colorRange([[1, 0, 0, 1], [0, 0, 1, 1]], 1);
 * // => ['rgba(255,0,0,1)', 'rgba(128,0,128,1)', 'rgba(0,0,255,1)']
 */
export const colorRange: IColorRange = (colors: Array<[number, number, number, number]>,
  precision: number = 0): string[] => {
  const output = base(colors, precision);
  for (let i = output.length; i--;) {
    (output as any)[i] = rgba(output[i]);
  }
  return output as unknown as string[];
};

/**
 * Converts a color to a string.
 * 
 * @param rgbaColor - The color to convert.
 * @returns The converted string.
 */
const rgba = colorRange.rgba = (rgbaColor: [number, number, number, number]): string => {
  const output = [
    0,
    0,
    0,
    rgbaColor[3],
  ];
  let i = 3;
  while (i--) {
    output[i] = Math.round(rgbaColor[i] * 255);
  }
  return 'rgba(' + output.join(',') + ')';
};

/**
 * Converts an array of colors to an array of strings.
 * 
 * @param input - The array of colors to convert.
 * @param precision - The precision of the colors.
 * @returns An array of strings.
 */
const base = colorRange.base = (input: Array<[number, number, number, number]>,
  precision: number): Array<[number, number, number, number]> => {
  const l = input.length;
  const output: Array<[number, number, number, number]> = [];
  let prev = input[l - 1];
  let follow: [number, number, number, number];
  let i = 0;
  for (; i < l; i++) {
    follow = input[i];
    NATIVE_PUSH.apply(output as any, __rangeColor(
      prev, follow, precision,
    ));
    output.push((prev = follow));
  }
  return output;
};

/**
 * Converts a color to a string.
 * 
 * @param c0 - The color to convert.
 * @param c1 - The color to convert.
 * @param precision - The precision of the colors.
 * @returns The converted string.
 */
const __rangeColor = (
  c0: [number, number, number, number],
  c1: [number, number, number, number],
  precision: number,
): Array<[number, number, number, number]> => {
  const max = precision + 1;
  const cl = 4;
  const output: Array<[number, number, number, number]> = new Array(precision) as any;
  let i: number;
  let il: number;
  let tmp: [number, number, number, number];
  let kl: number;
  let kr: number;
  let ci: number;
  for (i = 0; i < precision; i++) {
    il = 1 + i;
    tmp = (output[precision - il] = new Array(cl) as [number, number, number, number]);
    kl = il / max;
    kr = 1 - kl;
    for (ci = cl; ci--;) {
      (tmp as any)[ci] = c0[ci] * kl + c1[ci] * kr;
    }
  }
  return output;
};
