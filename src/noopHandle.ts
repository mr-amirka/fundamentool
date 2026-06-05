/**
 * No-op handler that returns the value unchanged.
 *
 * @param v - The value to pass through.
 * @returns The same value unchanged.
 * @example
 * [1, 2, 3].filter(noopHandle); // => [1, 2, 3]  (keeps truthy values)
 */
export const noopHandle = <T>(v: T): T => v;

