/**
 * Short description of a received value for error messages ("what was expected, what came").
 *
 * @param value - Anything a caller passed.
 * @returns `string "p10"`, `number 3`, `null`, `function`, `array`, `object`, `undefined undefined`.
 * @example
 * describeValue('p10'); // 'string "p10"'
 * describeValue(3);     // 'number 3'
 */
export function describeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `string "${value}"`;
  }
  if (typeof value === 'function') {
    return 'function';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value === 'object' ? 'object' : `${typeof value} ${String(value)}`;
}
