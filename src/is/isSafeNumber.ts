const MAX_SAFE_NUMBER = 2147483647;

/**
 * Checks that value can be parsed to a safe non-negative number less than `2147483647`.
 *
 * @param v - The value to check (coerced via `parseFloat`).
 * @returns `true` if value parses to a valid non-negative safe number.
 * @example
 * isSafeNumber(100);        // => true
 * isSafeNumber('3.14');     // => true
 * isSafeNumber(-1);         // => false
 * isSafeNumber(2147483647); // => false (not less than MAX_SAFE_NUMBER)
 */
export const isSafeNumber = (v: any): boolean => {
  const num = parseFloat(v);
  return !Number.isNaN(num) && num >= 0 && num < MAX_SAFE_NUMBER;
};

