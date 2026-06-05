import { isBlob } from '../../is/isBlob';
import { isArrayBuffer } from '../../is/isArrayBuffer';
import { isDefined } from '../../is/isDefined';
import { isObject } from '../../is/isObject';

const TYPE_BINARY = 'application/octet-binary';

function normalize(content: any): [
  content: string | ArrayBuffer,
  type: string,
] {
  let buffer: ArrayBuffer | undefined;
  return isDefined(content) ? (
    isObject(content) ? (
      isArrayBuffer(content)
        ? [content, TYPE_BINARY]
        : (
          isArrayBuffer(buffer = (content as any).buffer)
            ? [buffer, TYPE_BINARY]
            : [JSON.stringify(content), 'application/json']
        )
    ) : ['' + content, 'text/plain']
  ) : ['', TYPE_BINARY];
}

/**
 * Normalizes input into a `Blob`.
 *
 * Rules:
 * - Blob: returned as-is
 * - ArrayBuffer/buffer-like: stored as binary (`application/octet-binary`)
 * - Plain object: JSON-stringified (`application/json`)
 * - Other defined primitives: stringified as `text/plain`
 *
 * @param content - Any value to wrap into a `Blob`.
 * @param type - Optional MIME type override.
 * @returns A `Blob` instance containing the normalized content.
 * @example
 * from('hello');           // => Blob (text/plain)
 * from({ a: 1 });          // => Blob (application/json)
 * from(new ArrayBuffer(4)); // => Blob (application/octet-binary)
 */
export const from = (content: any, type?: string) => {
  if (isBlob(content)) return content;
  const args = normalize(content);
  return new Blob([args[0]], {type: type || args[1]});
};
