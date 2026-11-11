// The frame loop as a hook (fundamentool D-085, D-113): `useAnimationFrame` — a loop of `createAnimationFrame` per
// component, stopped by a state (`active`) and by an event (`pause`), over the view library's `useRef` + `useEffect`.
import {
  ANIMATION_FRAME_OPTIONS,
  createAnimationFrame,
} from '../browser/createAnimationFrame';
import type {
  TAnimationFrameOptions,
} from '../browser/createAnimationFrame';
import {
  boolean,
  lazy,
  object,
} from '../schema';
import {
  viewLibraryShape,
} from './library';
import type {
  TViewLibrary,
} from './library';

/**
 * The controls of something that plays — one shape for a frame loop now, a tween, a sprite or a sound later: `play`
 * goes on, `pause` stands still, `isPlaying` says whether it runs now. The tuple and its functions stay the same.
 */
export type TPlayback = readonly [play: () => void, pause: () => void, isPlaying: () => boolean];

/** `useAnimationFrame`'s options: the loop's (`createAnimationFrame`'s, but `time`) and when it runs. */
export type TUseAnimationFrameOptions = Omit<TAnimationFrameOptions, 'time'> & {
  /** A state: the loop runs only while it is `true` (default `true`); turned back on — goes on, `time` continues. */
  active?: boolean;
  /** Starts playing at mount (default `true`); `false` — still until `play()`. */
  autoplay?: boolean;
};

/** The view library's members `useAnimationFrame` uses; the rest of the library may come along. */
export type TAnimationFrameDeps = Pick<TViewLibrary, 'useRef' | 'useEffect'> & Partial<TViewLibrary>;

/** One component's loop: what the latest render gave, and its controls. */
type TLoop = {
  callback: (delta: number, time: number) => void;
  options: TUseAnimationFrameOptions | undefined;
  playback: TPlayback;
  /** Starts or stops the loop by the wish, `active` and the mount; restarts it when the loop's options changed. */
  sync: () => void;
  /** Mounted (`true`) or unmounted: unmount cancels the frame asked for. */
  mount: (mounted: boolean) => void;
};

const WHERE = '[fundamentool] animationFrameProvider';

const WHERE_HOOK = '[fundamentool] useAnimationFrame';

/** The view library's members the hook uses; the rest of the library may come along. */
const LIBRARY = /*#__PURE__*/ lazy(() => object(viewLibraryShape([
  'useRef',
  'useEffect',
])).passthrough());

/** The single description of `useAnimationFrame`'s options. */
export const USE_ANIMATION_FRAME_OPTIONS = /*#__PURE__*/ lazy(() => object({
  ...ANIMATION_FRAME_OPTIONS().omit({
    time: true,
  }).shape,
  active: boolean().optional(),
  autoplay: boolean().optional(),
}));

/** The effect that runs once: mounts the loop, its cleanup unmounts it. */
const ONCE: readonly unknown[] = [];

/** A component's loop over `createAnimationFrame`: its clock goes on across every stop. */
function createLoop(callback: TLoop['callback'], options: TLoop['options']): TLoop {
  let wish = options?.autoplay !== false;
  let mounted = false;
  let stop: (() => void) | 0 = 0;
  let clock = 0;
  // The options the running loop was started with
  let interval: number | undefined;
  let maxDelta: number | undefined;
  let clamp: boolean | undefined;
  let frame: TAnimationFrameOptions['frame'];

  const tick = (delta: number, time: number): void => {
    clock = time;
    try {
      loop.callback(delta, time);
    } catch (error) {
      // The loop ended with the throw (`createAnimationFrame`): stopped as by `pause()`, so `isPlaying()` says so and
      // a render doesn't restart a callback that fails — `play()` does
      stop = 0;
      wish = false;
      throw error;
    }
  };

  function halt(): void {
    if (stop) {
      stop();
      stop = 0;
    }
  }

  function sync(): void {
    const given = loop.options;
    const run = wish && mounted && given?.active !== false;
    if (stop && (!run || given?.interval !== interval || given?.maxDelta !== maxDelta || given?.clamp !== clamp
      || given?.frame !== frame)) {
      halt();
    }
    if (run && !stop) {
      interval = given?.interval;
      maxDelta = given?.maxDelta;
      clamp = given?.clamp;
      frame = given?.frame;
      stop = createAnimationFrame(tick, {
        interval,
        maxDelta,
        clamp,
        frame,
        time: clock,
      });
    }
  }

  const loop: TLoop = {
    callback,
    options,
    playback: [
      () => {
        wish = true;
        sync();
      },
      () => {
        wish = false;
        halt();
      },
      () => !!stop,
    ],
    sync,
    mount: (value) => {
      mounted = value;
      sync();
    },
  };
  return loop;
}

/**
 * `useAnimationFrame` over a React-like view library (React, Preact `compat`; later fundamentool's own) — bound once,
 * in the app's deps.
 *
 * @param library - The library's `useRef` and `useEffect` (the rest may come along).
 * @returns `{ useAnimationFrame }`.
 * @example
 * export const { useAnimationFrame } = animationFrameProvider({ useRef, useEffect });
 */
export function animationFrameProvider(library: TAnimationFrameDeps) {
  if (process.env.NODE_ENV !== 'production') {
    LIBRARY().parse(library, WHERE);
  }
  const {
    useRef,
    useEffect,
  } = library;

  /**
   * Runs `callback(delta, time)` on every animation frame while the component is mounted, `active` and not paused —
   * `createAnimationFrame`'s loop: `delta` 0 on the first frame after every start, a frame longer than `maxDelta`
   * skipped (or `clamp`ed), `time` the sum of the deltas given, continuing across every pause and `active` change. The
   * callback of the latest render is called (no `deps`). A change of `interval`, `maxDelta`, `clamp` or `frame`
   * restarts the running loop (its clock goes on). Unmount cancels the frame asked for. The options are checked at
   * mount, in development.
   *
   * @param callback - Called with `(delta, time)`, both ms.
   * @param options - `active` (true), `autoplay` (true), `interval` (0), `maxDelta` (250), `clamp` (false), `frame`.
   * @returns `[play, pause, isPlaying]` — the same tuple on every render. `isPlaying()` is `false` after `pause()` and
   *   while `active` is `false`, and after the callback throws (the loop stops as by `pause()`, the error goes up);
   *   `play()` while `active` is `false` marks the wish: the loop starts when it turns true.
   * @example
   * useAnimationFrame((delta) => api.rotate({ y: delta * 0.24 }), { active: !reduced && !dialogOpen });
   * // stops itself from inside its frame
   * const [, pause] = useAnimationFrame((delta) => {
   *   position = Math.min(position + delta * 0.5, target);
   *   if (position === target) {
   *     pause();
   *   }
   * });
   * // a button
   * const [play, pause, isPlaying] = useAnimationFrame(tick);
   * <button onClick={() => (isPlaying() ? pause() : play())} />
   * // spins only under the pointer
   * const [play, pause] = useAnimationFrame(spin, { autoplay: false });
   * <div onPointerEnter={play} onPointerLeave={pause} />
   */
  function useAnimationFrame(callback: (delta: number, time: number) => void,
    options?: TUseAnimationFrameOptions): TPlayback {
    const ref = useRef(null) as { current: TLoop | null };
    let loop = ref.current;
    if (!loop) {
      if (process.env.NODE_ENV !== 'production') {
        USE_ANIMATION_FRAME_OPTIONS().optional().parse(options, WHERE_HOOK);
      }
      loop = ref.current = createLoop(callback, options);
    }
    // The latest render's: the next frame calls this callback
    loop.callback = callback;
    loop.options = options;
    const current = loop;
    useEffect(() => {
      current.mount(true);
      return () => current.mount(false);
    }, ONCE);
    useEffect(() => current.sync());
    return current.playback;
  }

  return {
    useAnimationFrame,
  };
}
