import {
  toLower, 
} from './toLower';

const REGEXP = /([A-Z])/g;

/**
 * Converts camelCase string to delimited case using given delimiter.
 * 
 * @param value - The string to convert.
 * @param delimiter - The delimiter to use.
 * @returns The converted string.
 * @example
 * camelToDelimiterCase('camelCase', '-') // "camel-case"
 */
export function camelToDelimiterCase(value: string, delimiter: string): string {
  return value.replace(REGEXP, (_all, v: string) => delimiter + toLower(v));
}

