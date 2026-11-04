const REGEXP_TRIM_ZERO = /^0+|\.?0+$/g;
const DOT = '.';
const ZERO = '0';
const NINE = '9';
/** Below this a whole number is written plainly, with no exponent: the fast path takes it as is. */
const MAX_PLAIN = 1e15;
/** The longest text the fast path reads: longer ones may be past `MAX_PLAIN`. */
const MAX_PLAIN_LENGTH = 15;

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
  if (typeof v === 'string') {
    const plain = plainFixed(v);
    if (plain !== undefined) {
      return plain;
    }
  } else if (v % 1 === 0 && v < MAX_PLAIN && v > -MAX_PLAIN) {
    return '' + v;
  }
  const scaled = (v as number) * 100;
  if (isNaN(scaled)) {
    throw new Error('Parameter is invalid');
  }
  return (Math.round(scaled) * 0.01).toFixed(2).replace(REGEXP_TRIM_ZERO, '') || '0';
}

/**
 * The fast path of {@link toFixed}: text already in its result's form — digits, at most two after the dot, no
 * insignificant zeros — comes back as is (`'0.5'` without its leading zero), with no arithmetic and no regular
 * expression. Anything else is `undefined` and goes the long way. Most values a style compiler rounds are like that:
 * `'10'`, `'1.5'`, `'.25'`.
 *
 * @param s - The text to round.
 * @returns The result, or `undefined` when the text needs rounding.
 */
function plainFixed(s: string): string | undefined {
  const l = s.length;
  if (!l || l > MAX_PLAIN_LENGTH) {
    return undefined;
  }
  let dot = -1;
  let i = 0;
  let ch: string;
  for (; i < l; i++) {
    ch = s[i];
    if (ch === DOT) {
      if (dot > -1) {
        return undefined;
      }
      dot = i;
    } else if (ch < ZERO || ch > NINE) {
      return undefined;
    }
  }
  if (dot < 0) {
    return s[0] === ZERO && l > 1 ? undefined : s;
  }
  const fraction = l - dot - 1;
  if (!fraction || fraction > 2 || s[l - 1] === ZERO) {
    return undefined;
  }
  return !dot ? s : s[0] !== ZERO ? s : dot === 1 ? s.slice(1) : undefined;
}
