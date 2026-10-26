import {
  isPlainObjectBase,
} from './is/isPlainObject';

/** A longer string is cut in a message: its start and its length. */
const SHOWN_CHARS = 60;

/**
 * Short description of a received value for error messages ("what was expected, what came"). A string is quoted with
 * its quotes and line breaks escaped, so the message stays one line; a long one shows its first 60 characters and its
 * length. An object that isn't plain is named by its class, so "expects an object, got object" can't happen for one.
 *
 * @param value - Anything a caller passed.
 * @returns `string "p10"`, `number 3`, `bigint 10`, `null`, `undefined`, `function`, `array`, `object`,
 * `RegExp /ab+/g`, a class name (`Date`, `Map`, `BuildOptions`).
 * @example
 * describeValue('p10');      // 'string "p10"'
 * describeValue('say "hi"'); // 'string "say \"hi\""'
 * describeValue(3);          // 'number 3'
 * describeValue(/ab+/g);     // 'RegExp /ab+/g'
 * describeValue(new Map());  // 'Map'
 * describeValue('x'.repeat(70000)); // 'string "xx…x…" (70000 characters)' — the first 60 shown
 */
export function describeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.length > SHOWN_CHARS
      ? `string ${JSON.stringify(value.slice(0, SHOWN_CHARS)).slice(0, -1)}…" (${value.length} characters)`
      : `string ${JSON.stringify(value)}`;
  }
  if (typeof value === 'function') {
    return 'function';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value instanceof RegExp) {
    return `RegExp ${String(value)}`;
  }
  if (typeof value !== 'object') {
    return `${typeof value} ${String(value)}`;
  }
  return isPlainObjectBase(value) ? 'object' : className(value);
}

/** The class an object was made by; `object` when it has none to name. */
function className(value: object): string {
  const name = (value as { constructor?: { name?: unknown } }).constructor?.name;
  return typeof name === 'string' && name && name !== 'Object' ? name : 'object';
}
