import {
  createReadStream, 
} from 'fs';
import {
  TransformFrom, 
} from './TransformFrom';

/**
 * Creates a readable stream of parsed JSONL records from a file.
 *
 * @param path - Path to the JSONL file.
 * @param options - Optional `fs.createReadStream` options.
 * @returns A readable stream emitting parsed JSON objects one per line.
 * @example
 * read('./data.jsonl').on('data', (record) => console.log(record));
 */
export function read(path: string, options?: any): NodeJS.ReadableStream {
  return createReadStream(path, options).pipe(new (TransformFrom as any)());
}

