/**
 * Escapes HTML‑special characters in a string.
 * 
 * @param v - The string to escape.
 * @returns The escaped string.
 * @example
 * escapeHTML('<b>hi</b>'); // => '&lt;b&gt;hi&lt;/b&gt;'
 */
export const escapeHTML = (v: string): string => {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#039;');
};

