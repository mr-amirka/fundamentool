/**
 * What a `catch` caught, as an `Error`. JS can throw anything — a string, an object, `undefined` — and a cast
 * (`(ex as Error).message`) only convinces the compiler: a thrown string still gives `undefined`. This checks.
 *
 * @param value - What was caught.
 * @returns The value if it is an `Error`, else a new `Error` with its text.
 * @example
 * try { JSON.parse(text); } catch (ex) { report(asError(ex).message); }
 * asError('timeout').message; // => 'timeout'
 * asError(404).message;       // => '404'
 */
export function asError(value: unknown): Error {
  return value instanceof Error
    ? value
    : new Error(typeof value === 'string' ? value : String(value));
}
