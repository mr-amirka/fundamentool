import {
  camelToDelimiterCase, 
} from './camelToDelimiterCase';

/**
 * Converts camelCase string to kebab-case.
 * 
 * @param value - The string to convert.
 * @returns The converted string.
 * @example
 * camelToKebabCase('camelCase') // "camel-case"
 */
export const camelToKebabCase = (value: string): string => camelToDelimiterCase(value, '-');