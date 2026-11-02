/**
 * Escapes a string as a CSS identifier — CSSOM's "serialize an identifier", the algorithm of `CSS.escape`
 * (https://drafts.csswg.org/cssom/#serialize-an-identifier). One implementation everywhere, never the native one: a
 * build in Node and a page in a browser write the same bytes.
 *
 * - a letter, a digit, `-`, `_` and any character from U+0080 stay;
 * - a digit first (or after a leading `-`) and a control character are written by code: `2xl` → `\32 xl`;
 * - a lone `-` and every other ASCII character get a backslash: `a.b` → `a\.b`, `w{1}` → `w\{1\}`;
 * - NUL becomes U+FFFD.
 *
 * @param value - The string to escape.
 * @returns The identifier, ready for a selector.
 * @example
 * escapeCss('hello world'); // => 'hello\\ world'
 * escapeCss('2xl:p-4');     // => '\\32 xl\\:p-4'
 */
export function escapeCss(value: string): string {
  const l = value.length;
  const dashFirst = value[0] === '-';
  let out = '';
  let ch: string;
  let code: number;
  let digit: boolean;
  for (let i = 0; i < l; i++) {
    ch = value[i];
    code = value.charCodeAt(i);
    digit = ch >= '0' && ch <= '9';
    if (code === 0) {
      out += '�';
    } else if (code < 0x20 || code === 0x7f || digit && (i === 0 || i === 1 && dashFirst)) {
      out += '\\' + code.toString(16) + ' ';
    } else if (code >= 0x80 || digit || ch === '_' || ch === '-' && l > 1
      || ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z') {
      out += ch;
    } else {
      out += '\\' + ch;
    }
  }
  return out;
}
