import {
  extend, 
} from '../../extend';
import {
  limitStream, ILimitStream, 
} from '../../limitStream';
import {
  read, 
} from './read';

/**
 * Like `read`, but limits the number of JSONL records emitted.
 *
 * @param path - Path to the JSONL file.
 * @param options - Options including optional `limit` (number of records).
 * @returns A limited readable stream of parsed JSON objects.
 * @example
 * readLimited('./data.jsonl', { limit: 100 }).on('data', (rec) => console.log(rec));
 */
export function readLimited(path: string, options?: any) {
  options = extend({}, options);
  const limit = options.limit;
  delete options.limit;
  return limitStream(read(path, options), limit) as ILimitStream;
}

