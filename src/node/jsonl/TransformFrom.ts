import { ProviderOfTransformFrom } from '../../jsonl/ProviderOfTransformFrom';
import { Transform } from 'stream';
import { StringDecoder } from 'string_decoder';

/**
 * Node.js `Transform` stream that decodes a JSONL byte stream into parsed JS objects.
 *
 * @example
 * const stream = new TransformFrom();
 * stream.on('data', (obj) => console.log(obj));
 */
export const TransformFrom = ProviderOfTransformFrom({
  Transform,
  StringDecoder,
});

