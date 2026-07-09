import {
  provider, 
} from './provider';

export {
  provider, 
} from './provider';
export {
  from, 
} from './from';


/**
 * Reads a `Blob` as plain text.
 *
 * @example
 * const text = await toText(blob); // => 'hello'
 */
export const toText = provider<string>('readAsText');

/**
 * Reads a `Blob` as a `data:` URL (base64-encoded).
 *
 * @example
 * const url = await toBase64Url(blob); // => 'data:text/plain;base64,aGVsbG8='
 */
export const toBase64Url = provider<string>('readAsDataURL');

/**
 * Reads a `Blob` as an `ArrayBuffer`.
 *
 * @example
 * const buffer = await toArrayBuffer(blob); // => ArrayBuffer(5)
 */
export const toArrayBuffer = provider<ArrayBuffer>('readAsArrayBuffer');
