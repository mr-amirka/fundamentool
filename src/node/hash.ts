import * as crypto from 'crypto';

/**
 * Creates a hex hash of text using Node.js `crypto`.
 *
 * @param text - Text or `Buffer` to hash.
 * @param type - Hash algorithm (default: `'sha256'`).
 * @returns Hex-encoded hash string.
 * @example
 * hash('hello');         // => '2cf24dba...' (sha256)
 * hash('hello', 'md5');  // => '5d41402a...'
 */
export function hash(text: string | Buffer, type: string = 'sha256'): string {
  const h = crypto.createHash(type);
  h.update(text);
  return h.digest('hex');
}
