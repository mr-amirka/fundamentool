/** How a media condition is written: the range form (`(width < 480px)`) or `min-` / `max-` for older browsers. */
export type TCssMediaSyntax = 'range' | 'classic';

/** The comparison of a condition. */
export type TCssMediaOperator = '>=' | '>' | '<' | '<=';

/** A length with a unit the classic form can shift: `480px`, `48rem`, `30.5em`. */
const REGEXP_LENGTH = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)$/;

/** The shift of a strict comparison in the classic form: 0.02px, and the same at 16px in rem / em. */
const STRICT_SHIFT: Record<string, number> = {
  px: 0.02,
  rem: 0.00125,
  em: 0.00125,
};

/**
 * A width or height condition for `@media`. The classic form has no strict comparisons: `<` and `>` shift the length by
 * 0.02px (0.00125 in rem / em), as Bootstrap does. A strict comparison of a length that can't be shifted (`calc(…)`,
 * `var(…)`) stays in the range form.
 *
 * @param side - `width` or `height`.
 * @param operator - The comparison.
 * @param length - A CSS length: `480px`, `48rem`.
 * @param syntax - The form: `'range'` or `'classic'`.
 * @returns The condition in parentheses.
 * @example
 * cssMediaCondition('width', '<', '480px', 'range');    // => '(width < 480px)'
 * cssMediaCondition('width', '<', '480px', 'classic');  // => '(max-width: 479.98px)'
 * cssMediaCondition('width', '>=', '48rem', 'classic'); // => '(min-width: 48rem)'
 */
export function cssMediaCondition(
  side: string, operator: TCssMediaOperator, length: string, syntax: TCssMediaSyntax,
): string {
  const classic = syntax === 'classic';
  const greater = operator === '>';
  const strict = operator === '<' || greater;
  const matchs = classic && strict ? REGEXP_LENGTH.exec(length) : null;
  return !classic || strict && !matchs
    ? '(' + side + ' ' + operator + ' ' + length + ')'
    : '(' + (operator[0] === '>' ? 'min-' : 'max-') + side + ': ' + (matchs
      ? round(parseFloat(matchs[1]) + (greater ? 1 : -1) * STRICT_SHIFT[matchs[2]]) + matchs[2]
      : length) + ')';
}

/** Without the floating-point tail: `479.97999999` → `479.98`. */
function round(value: number): number {
  return Math.round(value * 100000) / 100000;
}
