/**
 * Creates a time-budgeted iterator for processing large arrays across animation frames.
 *
 * Each call advances through `items` starting from where the previous call stopped,
 * invoking `processItem` for each element until the per-call time budget is exhausted
 * or a full cycle completes. When `repeat` is `true` the iterator wraps to index 0
 * after the last element and keeps going indefinitely; when `false` it stops after
 * a single pass and `.isFinished()` returns `true`.
 *
 * Designed to be called inside `requestAnimationFrame` to spread heavy per-element
 * computation across frames without blocking the event loop.
 *
 * @param length - The number of items to process.
 * @param processItem - Called for each item with `(index, dtMs)`.
 *   `dtMs` is the elapsed time in milliseconds since this specific item was last
 *   processed. On the very first pass every item receives the time elapsed since
 *   the first `instance()` call.
 * @param timeLimitMs - Maximum wall-clock milliseconds to spend per call (default `8`).
 *   Falsy values (including `null`) fall back to the default.
 * @param repeat - When `true` the iterator wraps to index 0 after the last element
 *   and continues on subsequent calls (default `true`).
 *   Falsy values other than `false` are treated as `true`.
 * @param now - Clock function returning current time in milliseconds (default `performance.now`).
 *   Inject a mock here in tests instead of patching `performance`.
 * @returns The iterator function plus `.pause()`, `.play()`, `.isPaused()`, `.isFinished()`.
 * @example
 * const process = createLimitedTimeProcess(particles.length, (index, dt) => {
 *   particles[index].x += particles[index].vx * dt;
 * }, 8, true);
 * requestAnimationFrame(function loop() {
 *   process();
 *   requestAnimationFrame(loop);
 * });
 */
export function createLimitedTimeProcess(
  length: number,
  processItem: (index: number, dt: number) => void,
  timeLimitMs?: number | null,
  repeat?: boolean | null,
  now: () => number = () => performance.now(),
) {
  const limit = timeLimitMs || 8;
  const cyclic = !!repeat;
  const lastUpdates = new Float64Array(length);
  let lastIndex = 0;
  let pausedAt = 0;
  let started = false;
  let dt: number;

  // Initialises unvisited timestamps so the hot loop only needs `if (dt)`.
  // Called once before the first iteration; on resume `play()` shifts them instead.
  function preStart() {
    const t0 = now();
    let i = length;
    while (i--) {
      if (!lastUpdates[i]) lastUpdates[i] = t0;
    }
    started = true;
  }

  function instance() {
    if (pausedAt) return;
    if (!started) preStart();

    const callStart = now();
    let t = callStart;
    let counter = 0;
    let currentIndex = lastIndex;

    while (counter < length && (t - callStart) < limit) {
      dt = t - lastUpdates[currentIndex];
      if (!dt) {
        break;
      }

      processItem(currentIndex, dt);
      lastUpdates[currentIndex] = t;
      t = now();
  
      counter++;
      currentIndex++;

      if (cyclic && currentIndex >= length) {
        currentIndex = 0;
      }
    }

    lastIndex = currentIndex;
  }

  /** Suspends processing until `.play()` is called. */
  instance.pause = () => {
    if (!pausedAt) pausedAt = now();
  };

  /**
   * Resumes processing after a `.pause()`.
   * Shifts stored timestamps forward by the pause duration so that `dtMs`
   * values in `processItem` do not include idle time.
   */
  instance.play = () => {
    if (!pausedAt) return;
    if (!started) preStart();

    const pauseDuration = now() - pausedAt;
    let i = length;
    while (i--) {
      lastUpdates[i] += pauseDuration;
    }
    pausedAt = 0;
  };

  /** Returns `true` while the processor is suspended. */
  instance.isPaused = () => pausedAt !== 0;

  /** Returns `true` when `repeat` is `false` and all items have been processed once. */
  instance.isFinished = () => !cyclic && lastIndex >= length;

  return instance;
}
