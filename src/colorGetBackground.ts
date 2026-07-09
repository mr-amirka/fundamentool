import {
  color, 
} from './color';
import {
  push, 
} from './push';
import {
  pushArray, 
} from './pushArray';
import {
  splitProvider, 
} from './split/splitProvider';
import {
  camelToKebabCase, 
} from './camelToKebabCase';
import {
  joinSpace, 
} from './join/joinSpace';
import {
  joinComma, 
} from './join/joinComma';

const regexpBg = /^(---?[^;]+;?|[A-Fa-f0-9]+(\.[0-9]+)?)(p([0-9]+)([a-z%]*))?$/i;
const regexpAngle = /^(.*)((_r)_?([A-Za-z_]*)|_g(-?[0-9]+))$/i;
const regexpRepeat = /^(.*)_rpt$/i;
const regexpDelimeter = /--[^;]+(;[^-]*)?|[^-]+/gim;
const splitSuffix = splitProvider(/_+/);

/**
 * Builds CSS gradient(s) from a compact text description.
 *
 * Returns a single gradient string when `alt` is false,
 * or an array of rgb/rgba alternatives when `alt` is true.
 *
 * @param input - Compact gradient description string.
 * @param alt - Whether to return alternative rgb/rgba variants.
 * @returns Array of CSS gradient strings.
 * @example
 * colorGetBackground('ff0000-0000ff');
 * // => ['linear-gradient(180deg,#f00 0%,#00f 100%)']
 * colorGetBackground('ff0000-0000ff_r');
 * // => ['radial-gradient(circle,#f00 0%,#00f 100%)']
 */
export const colorGetBackground = (input: string, alt?: boolean): string[] => {
  let radial: string | undefined;
  let repeating = 0;
  let matches: RegExpExecArray | null;
  let angle = 180;
  let i: number;
  let v: string = input;

  if ((matches = regexpRepeat.exec(v))) {
    repeating = 1;
    v = matches[1];
  }

  if ((matches = regexpAngle.exec(v))) {
    v = matches[1];
    if (matches[3]) {
      radial = joinSpace(splitSuffix(camelToKebabCase(matches[4] || 'circle')));
    } else {
      i = matches[5] ? parseInt(matches[5], 10) : 0;
      angle = (angle + i) % 360;
      if (angle < 0) {
        angle += 360;
      }
    }
  }

  const vls = v.match(regexpDelimeter) || [];
  const l = vls.length;
  const end = Math.max(l - 1, 1);
  const prefix =
    (repeating ? 'repeating-' : '')
    + (radial ? 'radial' : 'linear')
    + '-gradient('
    + (radial || `${angle}deg`);

  const gradient: string[] = [];
  const outputRgb: string[] = [prefix];
  const outputRgba: string[] = [prefix];

  let alts: string[];
  let rgb: string;
  let rgba: string;
  let suffix: string;
  let pmatches: RegExpExecArray | null;
  let hasAlpha = 0;

  for (i = 0; i < l; i++) {
    pmatches = regexpBg.exec((v = vls[i])) as RegExpExecArray;
    suffix =
      ' '
      + (pmatches[4] || (end ? Math.round((i * 100) / end) : 0))
      + (pmatches[5] || '%');

    alts = color(pmatches[1] || v || Math.round((i * 15) / end).toString(16), alt);

    if (!i) {
      pushArray(gradient, alts);
    }

    rgb = alts[0];
    rgba = alts[1];
    if (rgba) {
      hasAlpha = 1;
    } else {
      rgba = rgb;
    }

    push(outputRgb, rgb + suffix);
    push(outputRgba, rgba + suffix);
  }

  if (alt) {
    if (l > 1) {
      push(gradient, joinComma(outputRgb) + ')');
      if (hasAlpha) {
        push(gradient, joinComma(outputRgba) + ')');
      }
    }
    return gradient;
  }

  if (l > 1) {
    return [joinComma(hasAlpha ? outputRgba : outputRgb) + ')'];
  }

  return gradient;
};

