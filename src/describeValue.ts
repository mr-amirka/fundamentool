/** A longer string is cut in a message: its start and its length. */
const SHOWN_CHARS = 60;

/**
 * Short description of a received value for error messages ("what was expected, what came"). A long string shows its
 * first 60 characters and its length — a message stays readable whatever came.
 *
 * @param value - Anything a caller passed.
 * @returns `string "p10"`, `number 3`, `null`, `function`, `array`, `object`, `undefined`.
 * @example
 * describeValue('p10'); // 'string "p10"'
 * describeValue(3);     // 'number 3'
 * describeValue('x'.repeat(70000)); // 'string "xx…x…" (70000 characters)' — the first 60 shown
 */
export function describeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.length > SHOWN_CHARS
      ? `string "${value.slice(0, SHOWN_CHARS)}…" (${value.length} characters)`
      : `string "${value}"`;
  }
  if (typeof value === 'function') {
    return 'function';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value === 'object' ? 'object' : `${typeof value} ${String(value)}`;
}
