import { kebabToCamelCase } from './kebabToCamelCase';
import { includes } from './includes';
import { splitProvider } from './split/splitProvider';

const splitLine = splitProvider(/\s*;\s*/);
const splitProp = splitProvider(/\s*:\s*/);
const reTrim = /^[\r\n {}]+|[\r\n {}]+$/g;

export type TCssMap = Record<string, string[]>;

/**
 * Parses a CSS string of the form `"color:red; font-size: 12px"` into an object.
 *
 * Values for one property are collected into an array of strings.
 *
 * @param text - CSS string to parse.
 * @param output - Optional destination object to merge into.
 * @returns Map of camelCase property names to arrays of value strings.
 * @example
 * cssPropertiesParseSimple('color:red; font-size:12px');
 * // => { color: ['red'], fontSize: ['12px'] }
 */
export const cssPropertiesParseSimple = (
  text: string,
  output?: TCssMap,
): TCssMap => {
  const result: TCssMap = output || {};

  const input = splitLine(text.replace(reTrim, ''));
  let line: [string, string];
  let name: string;
  let value: string;
  let values: string[] | undefined;
  let i = input.length;

  for (; i--;) {
    line = splitProp(input[i]) as [string, string];
    name = line[0];
    value = line[1];

    if (!name || !value) continue;

    name = kebabToCamelCase(name);
    values = result[name];

    if (values) {
      if (!includes(values, value)) {
        values.push(value);
      }
    } else {
      result[name] = [value];
    }
  }

  return result;
};

