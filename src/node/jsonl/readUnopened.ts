import {
  readUnopened as readUnopenedSimple, 
} from '../file/readUnopened';
import {
  TransformFrom, 
} from './TransformFrom';

/**
 * Creates a JSONL readable stream that polls the file until it becomes available.
 * Useful for reading files that are not yet opened/created.
 *
 * @param path - Path to the JSONL file.
 * @param options - Optional read options.
 * @returns A readable stream of parsed JSON objects.
 * @example
 * readUnopened('./data.jsonl').on('data', (rec) => console.log(rec));
 */
export function readUnopened(path: string, options?: any): NodeJS.ReadableStream {
  return readUnopenedSimple(path, options).pipe(new (TransformFrom as any)());
}

