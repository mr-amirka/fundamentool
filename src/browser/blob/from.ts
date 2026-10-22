import {
  isBlob,
} from '../../is/isBlob';
import {
  isArrayBuffer,
} from '../../is/isArrayBuffer';
import {
  isDefined,
} from '../../is/isDefined';
import {
  isObject,
} from '../../is/isObject';

const TYPE_BINARY = 'application/octet-binary';

function normalize(content: any): [
  content: BlobPart,
  type: string,
] {
  return isDefined(content) ? (
    isObject(content) ? (
      // A view (a typed array, a Node Buffer) as it is: its own bytes, not the whole buffer under it (a pooled Buffer
      // shares 8 KB with others)
      isArrayBuffer(content) || ArrayBuffer.isView(content)
        ? [
          content as BlobPart,
          TYPE_BINARY,
        ]
        : [
          JSON.stringify(content),
          'application/json',
        ]
    ) : [
      '' + content,
      'text/plain',
    ]
  ) : [
    '',
    TYPE_BINARY,
  ];
}

/**
 * Normalizes input into a `Blob`.
 *
 * Rules:
 * - Blob: returned as-is
 * - ArrayBuffer, a typed array, a Node Buffer: its bytes as binary (`application/octet-binary`) — a view's own bytes
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
  if (isBlob(content)) {
    return content;
  }
  const args = normalize(content);
  return new Blob([args[0]], {
    type: type || args[1],
  });
};
