import { isString } from './isString';

// eslint-disable-next-line
const URL_VALIDATION_REGEX = /^(https?:\/\/)?(([A-Za-zА-Яа-я0-9]|[A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9\-]*[A-Za-zА-Яа-я0-9])\.)+[A-Za-zА-Яа-я][A-Za-zА-Яа-я\-]*[A-Za-zА-Яа-я](\/([\w#!:.?+=&%@!\-\/])*)?/;

/**
 * Validates an HTTP/HTTPS URL (supports both Latin and Cyrillic domains).
 *
 * @param url - The value to validate.
 * @returns `true` if value is a string matching a valid HTTP/HTTPS URL pattern.
 * @example
 * isHttpUrl('https://example.com'); // => true
 * isHttpUrl('not-a-url');           // => false
 */
export const isHttpUrl = (url: any): boolean =>
  isString(url) && URL_VALIDATION_REGEX.test(url as string);

