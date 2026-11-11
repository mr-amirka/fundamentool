import {
  boolean,
  func,
  lazy,
  number,
  object,
} from '../schema';

declare function requestAnimationFrame(callback: (time: number) => void): number;
declare function cancelAnimationFrame(handle: number): void;

/** Where a loop gets its frames: the browser's `requestAnimationFrame` / `cancelAnimationFrame`, or a fake clock. */
export type TAnimationFrameSource = {
  /** Asks for the next frame; the callback gets the frame's timestamp, ms. Returns the request's handle. */
  request: (callback: (time: number) => void) => number;
  /** Cancels a request by its handle. */
  cancel: (handle: number) => void;
};

/** {@link createAnimationFrame}'s options. */
export type TAnimationFrameOptions = {
  /** The callback runs once at least this many ms have gathered; the frames between add up (default 0, every frame). */
  interval?: number;
  /** The longest frame counted, ms (default 250); `Infinity` — every frame counts in full. */
  maxDelta?: number;
  /** A frame longer than `maxDelta` counts as `maxDelta` (`true`) or as 0 — skipped (`false`, the default). */
  clamp?: boolean;
  /** Where the loop's clock starts, ms (default 0) — a restarted loop goes on from the `time` it stopped at. */
  time?: number;
  /** Where the frames come from (default the browser's `requestAnimationFrame` / `cancelAnimationFrame`). */
  frame?: TAnimationFrameSource;
};

/** The single description of {@link createAnimationFrame}'s options — `ANIMATION_FRAME_OPTIONS().keys`. */
export const ANIMATION_FRAME_OPTIONS = /*#__PURE__*/ lazy(() => object({
  interval: number().finite().min(0).optional(),
  maxDelta: number().positive().optional(),
  clamp: boolean().optional(),
  time: number().finite().optional(),
  frame: object({
    request: func(),
    cancel: func(),
  }).optional(),
}));

const WHERE = '[fundamentool] createAnimationFrame';

/** The browser's frames, read when a loop asks (not when the module loads: Node has none). */
const BROWSER_FRAME: TAnimationFrameSource = {
  // eslint-disable-next-line no-restricted-syntax -- this module is the helper subscriptions.md asks for
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Runs `callback(delta, time)` on every animation frame until stopped. `delta` — the ms since the previous frame, by
 * the frames' own timestamps; `time` — the sum of the deltas given so far (from `options.time`). The first frame gives
 * `delta` 0 (nothing to measure from). A frame longer than `maxDelta` (a hidden tab, a stall) gives 0 — the animation
 * stands where it was — or, with `clamp`, `maxDelta`. With `interval`, the frames add up until `interval` ms have
 * gathered, then one call gets the sum. A countdown that must not lose time reads its deadline against a clock instead
 * of summing deltas.
 *
 * @param callback - Called with `(delta, time)`, both ms.
 * @param options - `interval` (0), `maxDelta` (250), `clamp` (false), `time` (0), `frame` (the browser's).
 * @returns The loop's stop: cancels the frame asked for; a second call does nothing.
 * @example
 * const stop = createAnimationFrame((delta) => coin.rotate(delta * 0.24));     // every frame
 * createAnimationFrame(() => sprite.next(), { interval: 1000 / 12 });          // a sprite at 12 frames a second
 * createAnimationFrame((delta) => step(delta), { maxDelta: 33, clamp: true }); // physics: at most 33 ms a step
 * stop();
 * // a paused loop is a stopped one, restarted where its clock stood
 * let clock = 0;
 * let stopSwing = createAnimationFrame((_delta, time) => swing(Math.sin((clock = time) / 300)));
 * stopSwing();                                                                 // pause
 * stopSwing = createAnimationFrame((_delta, time) => swing(Math.sin((clock = time) / 300)), { time: clock });
 */
export function createAnimationFrame(callback: (delta: number, time: number) => void,
  options?: TAnimationFrameOptions): () => void {
  if (process.env.NODE_ENV !== 'production') {
    func().parse(callback, WHERE);
    ANIMATION_FRAME_OPTIONS().optional().parse(options, WHERE);
  }
  const interval = options?.interval || 0;
  const maxDelta = options?.maxDelta || 250;
  const clamp = !!options?.clamp;
  const frame = options?.frame || BROWSER_FRAME;
  const request = frame.request;
  let time = options?.time || 0;
  let last = 0;
  let started = false;
  let balance = 0;
  let stopped = false;
  let handle: number;

  function step(now: number): void {
    let delta = started ? now - last : 0;
    started = true;
    last = now;
    if (delta > maxDelta) {
      delta = clamp ? maxDelta : 0;
    }
    balance += delta;
    if (balance >= interval) {
      delta = balance;
      balance = 0;
      time += delta;
      callback(delta, time);
    }
    // Asked after the callback: a `stop()` from inside it ends the loop here, and a callback that throws ends it too
    // (the error goes up once, not every frame)
    if (!stopped) {
      handle = request(step);
    }
  }

  handle = request(step);

  return () => {
    if (!stopped) {
      stopped = true;
      frame.cancel(handle);
    }
  };
}
