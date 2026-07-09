import {
  extend, 
} from '../../extend';
import {
  limitStream, 
} from '../../limitStream';
import {
  readUnopened, 
} from './readUnopened';

/**
 * Like `readUnopened`, but limits the number of JSONL records emitted.
 *
 * @param path - Path to the JSONL file.
 * @param options - Options including optional `limit` (number of records).
 * @returns A limited readable stream of parsed JSON objects.
 * @example
 * readUnopenedLimited('./data.jsonl', { limit: 10 }).on('data', (rec) => console.log(rec));
 */
export function readUnopenedLimited(path: string, options?: any) {
  options = extend({}, options);
  const limit = options.limit;
  delete options.limit;
  return limitStream(readUnopened(path, options), limit);
}
