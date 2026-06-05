import { camelToDelimiterCase } from './camelToDelimiterCase';

/**
 * Converts camelCase string to snake_case.
 * 
 * @param value - The string to convert.
 * @returns The converted string.
 * @example
 * camelToSnakeCase('camelCase') // "camel_case"
 */
export const camelToSnakeCase = (value: string): string => camelToDelimiterCase(value, '_');