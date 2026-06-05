/**
 * Creates a numeric range from start (inclusive) to end (exclusive)
 * with the given step (absolute value).
 *
 * @param end - End value (or count when `start` is 0).
 * @param start - Start value (default: `0`).
 * @param step - Step size, always treated as positive (default: `1`).
 * @returns Array of numbers from `start` to `end` (exclusive) by `step`.
 * @example
 * range(5);        // => [0, 1, 2, 3, 4]
 * range(5, 1);     // => [1, 2, 3, 4]
 * range(1, 5, 2);  // => [1, 3]
 * range(5, 1, 2);  // => [5, 3, 1]
 */
export function range(
  end: number,
  start: number = 0,
  step: number = 1,
): number[] {
  if (!step) {
    step = 1;
  }
  if (step < 0) {
    step = -step;
  }

  let length = (end - start) / step;
  const sign = length < 0 ? -1 : 1;
  length *= sign;

  const output = new Array<number>(length);
  let i = 0;
  for (; i < length; i++) {
    output[i] = start + i * step * sign;
  }
  return output;
}

