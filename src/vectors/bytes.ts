/** A vector as bytes and back (fundamentool D-099): what a database column keeps. */
import {
  WHERE,
} from './math';
import type {
  TVector,
} from './math';

/** Bytes per number: a 32-bit float. */
const FLOAT = 4;

/**
 * A vector as bytes: each number a 32-bit float, little-endian on every platform — a `BLOB` column.
 *
 * @param vector - The vector.
 * @returns Its bytes, 4 per number.
 * @example
 * toBytes([1, -2]); // => Uint8Array [0, 0, 128, 63, 0, 0, 0, 192]
 */
export function toBytes(vector: TVector): Uint8Array {
  const length = vector.length;
  const bytes = new Uint8Array(length * FLOAT);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < length; i++) {
    view.setFloat32(
      i * FLOAT, vector[i], true,
    );
  }
  return bytes;
}

/**
 * A vector from its bytes (`toBytes`'s).
 *
 * @param bytes - 4 bytes per number, little-endian; a Node `Buffer` is a `Uint8Array` too.
 * @returns The vector.
 * @throws {TypeError} The length isn't a multiple of 4.
 * @example
 * fromBytes(toBytes([1, -2])); // => Float32Array [1, -2]
 */
export function fromBytes(bytes: Uint8Array): Float32Array {
  if (bytes.length % FLOAT !== 0) {
    throw new TypeError(`${WHERE} fromBytes: 4 bytes per number expected, got ${bytes.length} bytes`);
  }
  const length = bytes.length / FLOAT;
  const vector = new Float32Array(length);
  const view = new DataView(
    bytes.buffer, bytes.byteOffset, bytes.byteLength,
  );
  for (let i = 0; i < length; i++) {
    vector[i] = view.getFloat32(i * FLOAT, true);
  }
  return vector;
}
