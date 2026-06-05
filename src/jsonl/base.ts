import { LineBasedFormat } from '../LineBasedFormat';

/**
 * JSONL `parse` and `stringify` utilities backed by `JSON.parse`/`JSON.stringify`.
 *
 * @example
 * parse('{"a":1}\n{"b":2}'); // => [{ a: 1 }, { b: 2 }]
 * stringify([{ a: 1 }, { b: 2 }]); // => '{"a":1}\n{"b":2}'
 */
export const {
  parse,
  stringify,
} = new LineBasedFormat({
  parse: JSON.parse,
  stringify: JSON.stringify,
});


