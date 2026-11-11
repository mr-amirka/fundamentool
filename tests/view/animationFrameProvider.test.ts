/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * The frame loop as a hook (fundamentool D-085, D-113): `useAnimationFrame` — stopped by a state (`active`) and by an
 * event (`pause`), the latest callback, the clock going on — with React and Preact, over a fake clock of frames.
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act as reactAct,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import * as preact from 'preact';
import * as preactHooks from 'preact/hooks';
import {
  act as preactAct,
} from 'preact/test-utils';
import {
  animationFrameProvider,
  USE_ANIMATION_FRAME_OPTIONS,
} from '../../src/view';
import type {
  TPlayback,
  TUseAnimationFrameOptions,
} from '../../src/view';
import type {
  TAnimationFrameSource,
} from '../../src/browser/createAnimationFrame';

type TCallback = (delta: number, time: number) => void;

/** What a test renders: the hook's callback and options; what it reads back — the tuple of each render. */
type TProps = {
  callback: TCallback;
  options?: TUseAnimationFrameOptions;
};

type TLibrary = {
  name: string;
  hooks: ReturnType<typeof animationFrameProvider>;
  h: (...args: any[]) => unknown;
  /** Renders `view` with `props`; `render` again with new props; `unmount`. */
  mount: (view: (props: TProps) => unknown, props: TProps) => {
    render: (next: TProps) => void;
    unmount: () => void;
  };
  act: (work: () => void) => void;
};

const REACT: TLibrary = {
  name: 'React',
  hooks: animationFrameProvider({
    useRef: React.useRef,
    useEffect: React.useEffect,
  }),
  h: React.createElement as (...args: any[]) => unknown,
  mount(view, props) {
    const root = createRoot(document.createElement('div'));
    const render = (next: TProps) => reactAct(() => root.render(React.createElement(view as () => React.ReactElement, next)));
    render(props);
    return {
      render,
      unmount: () => reactAct(() => root.unmount()),
    };
  },
  act: (work) => reactAct(work),
};

const PREACT: TLibrary = {
  name: 'Preact',
  hooks: animationFrameProvider({
    useRef: preactHooks.useRef,
    useEffect: preactHooks.useEffect,
  }),
  h: preact.h as (...args: any[]) => unknown,
  mount(view, props) {
    const container = document.createElement('div');
    const render = (next: TProps) => preactAct(() => {
      preact.render(preact.h(view as preact.FunctionComponent<TProps>, next), container);
    });
    render(props);
    return {
      render,
      unmount: () => preactAct(() => {
        preact.render(null, container);
      }),
    };
  },
  act: (work) => preactAct(work),
};

/** A fake clock of frames: `tick(ms)` runs the frames asked for, `ms` after the previous one. */
function fakeFrames() {
  const pending = new Map<number, (time: number) => void>();
  let id = 0;
  let now = 1000;
  const frame: TAnimationFrameSource = {
    request: (callback) => {
      pending.set(++id, callback);
      return id;
    },
    cancel: (handle) => {
      pending.delete(handle);
    },
  };
  return {
    frame,
    pending,
    tick(ms: number): void {
      now += ms;
      const due = [...pending.values()];
      pending.clear();
      due.forEach((callback) => callback(now));
    },
  };
}

describe.each([
  REACT,
  PREACT,
])('view/animationFrameProvider — $name', (library) => {
  const {
    useAnimationFrame,
  } = library.hooks;

  /** Mounts a component with the hook; `playbacks` — the tuple of every render. */
  function setup(callback: TCallback, options: TUseAnimationFrameOptions = {}) {
    const clock = fakeFrames();
    const playbacks: TPlayback[] = [];
    const View = (props: TProps) => {
      playbacks.push(useAnimationFrame(props.callback, props.options));
      return null;
    };
    const withFrame = (given: TUseAnimationFrameOptions) => ({
      frame: clock.frame,
      ...given,
    });
    const view = library.mount(View, {
      callback,
      options: withFrame(options),
    });
    return {
      clock,
      playbacks,
      /** The tuple of the latest render. */
      playback: () => playbacks[playbacks.length - 1],
      render: (next: TCallback, nextOptions: TUseAnimationFrameOptions = {}) => view.render({
        callback: next,
        options: withFrame(nextOptions),
      }),
      unmount: view.unmount,
      tick: (ms: number) => library.act(() => clock.tick(ms)),
    };
  }

  test('every frame: delta 0 on the first, then the frame\'s ms; time grows by it', () => {
    const callback = jest.fn();
    const {
      tick,
    } = setup(callback);
    tick(16);
    tick(17);
    expect(callback.mock.calls).toEqual([
      [
        0,
        0,
      ],
      [
        17,
        17,
      ],
    ]);
  });

  test('a long frame is skipped by default, counted as maxDelta with clamp', () => {
    const skipped = jest.fn();
    const first = setup(skipped);
    first.tick(0);
    first.tick(1000);
    expect(skipped).toHaveBeenLastCalledWith(0, 0);
    const clamped = jest.fn();
    const second = setup(clamped, {
      maxDelta: 100,
      clamp: true,
    });
    second.tick(0);
    second.tick(1000);
    expect(clamped).toHaveBeenLastCalledWith(100, 100);
  });

  test('interval: one call with the sum', () => {
    const callback = jest.fn();
    const {
      tick,
    } = setup(callback, {
      interval: 50,
    });
    tick(0);
    tick(30);
    expect(callback).not.toHaveBeenCalled();
    tick(30);
    expect(callback).toHaveBeenCalledWith(60, 60);
  });

  test('active: false — no frames asked for; back to true — goes on, time continues', () => {
    const callback = jest.fn();
    const {
      clock,
      render,
      tick,
      playback,
    } = setup(callback);
    tick(0);
    tick(20);
    render(callback, {
      active: false,
    });
    expect(clock.pending.size).toBe(0);
    expect(playback()[2]()).toBe(false);
    tick(500);
    render(callback, {
      active: true,
    });
    expect(playback()[2]()).toBe(true);
    tick(10);
    tick(10);
    expect(callback.mock.calls).toEqual([
      [
        0,
        0,
      ],
      [
        20,
        20,
      ],
      [
        0,
        20,
      ],
      [
        10,
        30,
      ],
    ]);
  });

  test('pause() from a handler and play() resume; time continues, the first frame after play gives 0', () => {
    const callback = jest.fn();
    const {
      clock,
      tick,
      playback,
    } = setup(callback);
    const [
      play,
      pause,
      isPlaying,
    ] = playback();
    tick(0);
    tick(16);
    library.act(pause);
    expect(isPlaying()).toBe(false);
    expect(clock.pending.size).toBe(0);
    library.act(pause);
    tick(1000);
    library.act(play);
    library.act(play);
    expect(isPlaying()).toBe(true);
    expect(clock.pending.size).toBe(1);
    tick(16);
    tick(16);
    expect(callback.mock.calls.slice(2)).toEqual([
      [
        0,
        16,
      ],
      [
        16,
        32,
      ],
    ]);
  });

  test('pause() from inside the callback stops it in that frame', () => {
    const deltas: number[] = [];
    let pauseLoop: () => void = () => undefined;
    const {
      clock,
      tick,
      playback,
    } = setup((delta) => {
      deltas.push(delta);
      if (deltas.length === 2) {
        pauseLoop();
      }
    });
    pauseLoop = playback()[1];
    tick(0);
    tick(16);
    tick(16);
    expect(deltas).toEqual([
      0,
      16,
    ]);
    expect(clock.pending.size).toBe(0);
    expect(playback()[2]()).toBe(false);
  });

  test('a callback that throws stops the loop as pause() does; a render keeps it stopped, play() goes on', () => {
    let calls = 0;
    const failing = () => {
      calls++;
      if (calls === 2) {
        throw new Error('broken frame');
      }
    };
    const {
      clock,
      tick,
      playback,
      render,
    } = setup(failing);
    tick(0);
    // outside `act`: a throw inside it leaves React's test scope broken for the next tests; the frame renders nothing
    expect(() => clock.tick(16)).toThrow('broken frame');
    expect(clock.pending.size).toBe(0);
    expect(playback()[2]()).toBe(false);
    render(failing);
    expect(clock.pending.size).toBe(0);
    library.act(playback()[0]);
    expect(playback()[2]()).toBe(true);
    tick(16);
    expect(calls).toBe(3);
  });

  test('autoplay: false — still until play()', () => {
    const callback = jest.fn();
    const {
      clock,
      tick,
      playback,
    } = setup(callback, {
      autoplay: false,
    });
    expect(clock.pending.size).toBe(0);
    expect(playback()[2]()).toBe(false);
    tick(16);
    expect(callback).not.toHaveBeenCalled();
    library.act(playback()[0]);
    tick(16);
    expect(callback).toHaveBeenCalledWith(0, 0);
  });

  test('play() while active is false marks the wish: the loop starts when active turns true', () => {
    const callback = jest.fn();
    const {
      clock,
      render,
      tick,
      playback,
    } = setup(callback, {
      autoplay: false,
      active: false,
    });
    library.act(playback()[0]);
    expect(playback()[2]()).toBe(false);
    expect(clock.pending.size).toBe(0);
    render(callback, {
      autoplay: false,
      active: true,
    });
    expect(playback()[2]()).toBe(true);
    tick(16);
    expect(callback).toHaveBeenCalledWith(0, 0);
  });

  test('the latest callback is called, no deps; the tuple is the same on every render', () => {
    const first = jest.fn();
    const second = jest.fn();
    const {
      render,
      tick,
      playbacks,
    } = setup(first);
    tick(0);
    render(second);
    tick(16);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(16, 16);
    expect(playbacks.length).toBeGreaterThan(1);
    playbacks.forEach((each) => {
      expect(each).toBe(playbacks[0]);
    });
  });

  test('a change of the loop\'s options restarts it, the clock going on; the same ones keep it', () => {
    const callback = jest.fn();
    const {
      clock,
      render,
      tick,
    } = setup(callback);
    tick(0);
    tick(16);
    render(callback, {});
    tick(16);
    expect(callback).toHaveBeenLastCalledWith(16, 32);
    render(callback, {
      interval: 20,
    });
    expect(clock.pending.size).toBe(1);
    tick(16);
    tick(16);
    expect(callback).toHaveBeenCalledTimes(3);
    tick(16);
    expect(callback).toHaveBeenLastCalledWith(32, 64);
  });

  test('unmount cancels the frame asked for; play() after it asks for nothing', () => {
    const callback = jest.fn();
    const {
      clock,
      unmount,
      tick,
      playback,
    } = setup(callback);
    tick(0);
    unmount();
    expect(clock.pending.size).toBe(0);
    playback()[0]();
    expect(clock.pending.size).toBe(0);
    expect(playback()[2]()).toBe(false);
  });

  test('wrong options: an unknown key or a bad value — an error at mount', () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => setup(() => undefined, {
        activ: false,
      } as never)).toThrow('[fundamentool] useAnimationFrame: unknown option "activ". Did you mean "active"?');
      expect(() => setup(() => undefined, {
        autoplay: 'no',
      } as never)).toThrow(/autoplay.*true or false/);
      expect(() => setup(() => undefined, {
        time: 5,
      } as never)).toThrow(/unknown option "time"/);
    } finally {
      quiet.mockRestore();
    }
  });
});

describe('view/animationFrameProvider', () => {
  test('the library must give useRef and useEffect', () => {
    expect(() => animationFrameProvider({
      useRef: React.useRef,
    } as never)).toThrow('[fundamentool] animationFrameProvider: "useEffect" expects the view library\'s function');
  });

  test('its options\' single key list: the loop\'s but time, and active, autoplay', () => {
    expect(USE_ANIMATION_FRAME_OPTIONS().keys).toEqual([
      'interval',
      'maxDelta',
      'clamp',
      'frame',
      'active',
      'autoplay',
    ]);
  });
});
