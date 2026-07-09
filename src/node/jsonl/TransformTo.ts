import {
  Transform, 
} from 'stream';
import {
  ProviderOfTransformTo, 
} from '../../jsonl/ProviderOfTransformTo';

/**
 * Node.js `Transform` stream that serializes JS objects into a JSONL byte stream.
 *
 * @example
 * const stream = new TransformTo();
 * stream.write({ a: 1 }); // emits '{"a":1}\n'
 */
export const TransformTo = ProviderOfTransformTo({
  Transform,
});

