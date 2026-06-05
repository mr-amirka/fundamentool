import { escapeHTML } from './escapeHTML';

const REGEXP_LINE_BREAK = /\r?\n/;

/**
 * Escapes HTML and replaces line breaks with `<br/>`.
 * 
 * @param v - The string to convert to HTML.
 * @returns The HTML string.
 * @example
 * toHTML('a < b\nfoo'); // => 'a &lt; b<br/>foo'
 */
export const toHTML = (v: string): string =>
  escapeHTML(v).replace(REGEXP_LINE_BREAK, '<br/>');
