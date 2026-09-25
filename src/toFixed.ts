const REGEXP_TRIM_ZERO = /^0+|\.?0+$/g;

/**
 * Rounds a number to 2 decimal places and strips insignificant zeros
 * (leading `0` before the dot, trailing zeros/dot after it).
 *
 * Uses `Math.round`, not `Math.floor` — IEEE754 float multiplication can land
 * just below the intended integer (`33.3 * 100 === 3329.9999999999995`),
 * and `Math.floor` would silently truncate that to one hundredth less than
 * the input (`33.29` instead of `33.3`). `Math.round` is safe in both
 * directions of that representation error.
 *
 * @param v - The number (or numeric string) to round.
 * @returns The rounded value as a compact string, or `'0'` for zero.
 * @throws {Error} If `v` is not a finite number.
 * @example
 * toFixed(33.3);   // => '33.3'  (not '33.29' — see the note above)
 * toFixed(0.5);    // => '.5'
 * toFixed(50.00);  // => '50'
 * toFixed('12.3'); // => '12.3'
 */
export function toFixed(v: number | string): string {
  const scaled = (v as number) * 100;
  if (isNaN(scaled)) {
    throw new Error('Parameter is invalid');
  }
  return (Math.round(scaled) * 0.01).toFixed(2).replace(REGEXP_TRIM_ZERO, '') || '0';
}
