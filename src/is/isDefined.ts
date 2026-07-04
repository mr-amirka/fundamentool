/**
 * Type guard: checks whether value is neither `undefined` nor `null`.
 * Narrows the type from `T | undefined | null` to `T` inside the `if` block.
 *
 * @param v - The value to check.
 * @returns `true` if value is defined and not null.
 * @example
 * isDefined(0);         // => true
 * isDefined('');        // => true
 * isDefined(null);      // => false
 * isDefined(undefined); // => false
 *
 * // Type narrowing:
 * const x: number | undefined = getValue();
 * if (isDefined(x)) {
 *   const doubled = x * 2; // x is number here, no TS error
 * }
 */
export const isDefined = <T>(v: T | undefined | null): v is T => v !== undefined && v !== null;
