/**
 * A short, fast, non-cryptographic hash of a text (cyrb53: two 32-bit lanes mixed into 53 bits), written in base 36 —
 * a cache key that says whether a text changed: a section's version, a file's content. Pure and the same on every
 * platform; for security use a cryptographic hash (`fundamentool/node`'s `hash`).
 *
 * @param text - The text.
 * @param seed - Another seed gives another, independent hash of the same text. Default: `0`.
 * @returns Up to 11 characters, `[0-9a-z]`.
 *
 * @example
 * hashText('hello');      // '19jqrdkps12' — always the same for the same text
 * hashText('hello', 1);   // another value
 * hashText('');           // a value too: the empty text has a hash
 */
export function hashText(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  const length = text.length;
  let code: number;
  for (let i = 0; i < length; i++) {
    code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
