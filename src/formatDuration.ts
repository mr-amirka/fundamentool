/**
 * A duration as `m:ss` — hours as minutes over 59 (`75:03`), the same in every locale: a game's timer. Negative and
 * non-numeric values show `0:00`.
 *
 * @param ms - the duration in milliseconds.
 * @returns `m:ss`.
 *
 * @example
 * formatDuration(0);         // '0:00'
 * formatDuration(65_000);    // '1:05'
 * formatDuration(4_503_000); // '75:03'
 */
export function formatDuration(ms: number): string {
  const totalSeconds = ms > 0 ? Math.floor(ms / 1000) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}
