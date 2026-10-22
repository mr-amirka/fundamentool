import {
  collect,
} from './collect';
import {
  read as simpleRead,
} from '../read';

/**
 * Reads all records from a JSONL file into memory as an array of parsed objects.
 * Optionally attaches an `onReadable` listener to the underlying stream.
 *
 * @param path - Path to the JSONL file.
 * @param options - Stream options passed to the underlying read stream.
 * @param onReadable - Optional callback fired when the stream becomes readable.
 * @returns Promise resolving to an array of parsed JSON objects.
 * @example
 * const records = await read('/data/events.jsonl');
 */
export function read(
  path: string,
  options?: any,
  onReadable?: () => void,
): Promise<any[]> {
  const stream = simpleRead(path, options);
  return collect(stream, onReadable);
}

