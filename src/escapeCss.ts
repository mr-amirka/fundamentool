import {
  executeTry, 
} from './executeTry';

const regexpEscape = /([[\]#.*^$()><+~=|:;,"'`\s@%\\!/])/g;

/**
 * Экранирует строку для безопасного использования в CSS‑селекторе.
 * 
 * @param value - The string to escape.
 * @returns The escaped string.
 * @example
 * escapeCss('hello world'); // => 'hello\\ world'
 */
export const escapeCss: (value: string) => string =
  executeTry(() => CSS.escape)
    || ((value: string) => value.replace(regexpEscape, '\\$1'));
