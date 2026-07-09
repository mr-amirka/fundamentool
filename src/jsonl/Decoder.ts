import {
  LineDecoder, 
} from '../LineDecoder';

/**
 * JSONL line decoder — a `LineDecoder` pre-configured with `JSON.parse`.
 *
 * @example
 * const decoder = new Decoder();
 * decoder.push(Buffer.from('{"a":1}\n{"b":2}\n'));
 */
export const Decoder = LineDecoder.provider(JSON.parse);
