import {
  isBoolean, 
} from './is/isBoolean';
import {
  isNumber, 
} from './is/isNumber';
import {
  isDefined, 
} from './is/isDefined';
import {
  isNaN, 
} from './is/isNaN';


function normalize(
  value: number, minVal?: number, maxVal?: number,
): number {
  if (isDefined(minVal)) {
    if (isNumber(minVal)) {
      value = value > minVal ? value : minVal;
    } else {
      throw new TypeError('min value should be number: ' + minVal);
    }
  }
  if (isDefined(maxVal)) {
    if (isNumber(maxVal)) {
      value = value < maxVal ? value : maxVal;
    } else {
      throw new TypeError('max value should be number: ' + maxVal);
    }
  }
  return value;
}

function numvalProvider(parse: (v: any) => number) {
  return (
    value: any,
    def?: number,
    minVal?: number,
    maxVal?: number,
  ): number => {
    if (isBoolean(value)) {
      return normalize(
        value ? 1 : 0, minVal, maxVal,
      );
    }
    const parsed = parse(value);
    return isNaN(parsed)
      ? def ?? 0
      : normalize(
        parsed, minVal, maxVal,
      );
  };
}

/**
 * Parses a number string and returns the integer value.
 * 
 * @param value - The value to parse.
 * @param def - The default value.
 * @param minVal - The minimum value.
 * @param maxVal - The maximum value.
 * @returns The integer value, or `def` (default 0) if parsing fails.
 * @example
 * intval('42px');       // => 42
 * intval('abc', 7);     // => 7
 * intval(3, 0, 1, 10);  // => 3 (clamped to [1,10])
 */
export const intval = numvalProvider(parseInt);

/**
 * Parses a number string and returns the float value.
 *
 * @param value - The value to parse.
 * @param def - The default value returned when parsing fails (default 0).
 * @param minVal - Optional minimum clamp value.
 * @param maxVal - Optional maximum clamp value.
 * @returns The float value, or `def` if parsing fails.
 * @example
 * floatval('3.14'); // => 3.14
 * floatval('abc'); // => 0
 */
export const floatval = numvalProvider(parseFloat);

