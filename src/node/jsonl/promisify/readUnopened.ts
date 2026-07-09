import {
  readUnopened as simpleReadUnopened, 
} from '../readUnopened';

/**
 * Reads all records from a JSONL file via `readUnopened` into memory as an array of parsed objects.
 * Polls the file until it becomes available. Optionally attaches an `onReadable` listener.
 *
 * @param path - Path to the JSONL file.
 * @param options - Stream options passed to the underlying read stream.
 * @param onReadable - Optional callback fired when the stream becomes readable.
 * @returns Promise resolving to an array of parsed JSON objects.
 * @example
 * const records = await readUnopened('/data/events.jsonl');
 */
export function readUnopened(
  path: string,
  options?: any,
  onReadable?: () => void,
): Promise<any[]> {
  const stream = simpleReadUnopened(path, options);
  if (onReadable) {
    stream.on('readable', onReadable);
  }
  return new Promise<any[]>((resolve, reject) => {
    const items: any[] = [];
    stream.on('data', (item: any) => items.push(item));
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}

