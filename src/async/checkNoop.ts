/**
 * Default `checkFn` for async helpers that always allows continuation.
 * Used when no custom check function is provided.
 *
 * @returns `true` – meaning the loop should continue.
 * @example
 * checkNoop(); // => true
 */
export function checkNoop(): boolean {
  return true;
}
