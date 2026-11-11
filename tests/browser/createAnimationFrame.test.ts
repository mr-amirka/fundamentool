import {
  ANIMATION_FRAME_OPTIONS,
  createAnimationFrame,
} from '../../src/browser/createAnimationFrame';
import type {
  TAnimationFrameSource,
} from '../../src/browser/createAnimationFrame';

/** A fake clock of frames: `tick(ms)` runs the frames asked for, `ms` after the previous one. */
function fakeFrames() {
  const pending = new Map<number, (time: number) => void>();
  let id = 0;
  let now = 5000;
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

describe('browser/createAnimationFrame', () => {
  test('a callback that throws ends the loop: the error goes up once, no frame is asked for after it', () => {
    const clock = fakeFrames();
    const callback = jest.fn(() => {
      throw new Error('boom');
    });
    createAnimationFrame(callback, {
      frame: clock.frame,
    });
    expect(() => clock.tick(16)).toThrow('boom');
    expect(clock.pending.size).toBe(0);
    clock.tick(16);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('every frame: delta by the frames\' own timestamps, time the sum; the first frame gives 0', () => {
    const clock = fakeFrames();
    const callback = jest.fn();
    createAnimationFrame(callback, {
      frame: clock.frame,
    });
    clock.tick(16.7);
    clock.tick(16.7);
    clock.tick(16.6);
    expect(callback.mock.calls.map(([
      delta,
      time,
    ]) => [
      +delta.toFixed(1),
      +time.toFixed(1),
    ])).toEqual([
      [
        0,
        0,
      ],
      [
        16.7,
        16.7,
      ],
      [
        16.6,
        33.3,
      ],
    ]);
  });

  test('never reads Date.now()', () => {
    const clock = fakeFrames();
    const now = jest.spyOn(Date, 'now');
    createAnimationFrame(() => undefined, {
      frame: clock.frame,
    });
    clock.tick(16);
    clock.tick(16);
    expect(now).not.toHaveBeenCalled();
    now.mockRestore();
  });

  test('a frame longer than maxDelta is skipped (0) by default; clamp counts it as maxDelta; Infinity catches up', () => {
    const run = (options: object) => {
      const clock = fakeFrames();
      const deltas: number[] = [];
      createAnimationFrame((delta) => deltas.push(delta), {
        frame: clock.frame,
        ...options,
      });
      clock.tick(16);
      clock.tick(30000);
      clock.tick(16);
      return deltas;
    };
    expect(run({})).toEqual([
      0,
      0,
      16,
    ]);
    expect(run({
      clamp: true,
    })).toEqual([
      0,
      250,
      16,
    ]);
    expect(run({
      maxDelta: 100,
      clamp: true,
    })).toEqual([
      0,
      100,
      16,
    ]);
    expect(run({
      maxDelta: Infinity,
    })).toEqual([
      0,
      30000,
      16,
    ]);
  });

  test('the default maxDelta is 250: a 250 ms frame counts, a 251 ms one is skipped', () => {
    const clock = fakeFrames();
    const deltas: number[] = [];
    createAnimationFrame((delta) => deltas.push(delta), {
      frame: clock.frame,
    });
    clock.tick(0);
    clock.tick(250);
    clock.tick(251);
    expect(deltas).toEqual([
      0,
      250,
      0,
    ]);
  });

  test('interval: frames add up until it is reached, then one call with the sum', () => {
    const clock = fakeFrames();
    const callback = jest.fn();
    createAnimationFrame(callback, {
      interval: 100,
      frame: clock.frame,
    });
    clock.tick(40);
    clock.tick(40);
    clock.tick(40);
    expect(callback).not.toHaveBeenCalled();
    clock.tick(40);
    expect(callback).toHaveBeenLastCalledWith(120, 120);
    clock.tick(50);
    expect(callback).toHaveBeenCalledTimes(1);
    clock.tick(50);
    expect(callback).toHaveBeenLastCalledWith(100, 220);
  });

  test('interval sums the capped deltas: a skipped frame adds nothing', () => {
    const clock = fakeFrames();
    const callback = jest.fn();
    createAnimationFrame(callback, {
      interval: 50,
      frame: clock.frame,
    });
    clock.tick(0);
    clock.tick(30);
    clock.tick(5000);
    expect(callback).not.toHaveBeenCalled();
    clock.tick(30);
    expect(callback).toHaveBeenCalledWith(60, 60);
  });

  test('time starts where the option says: a restarted loop goes on', () => {
    const clock = fakeFrames();
    const callback = jest.fn();
    createAnimationFrame(callback, {
      time: 1000,
      frame: clock.frame,
    });
    clock.tick(10);
    clock.tick(10);
    expect(callback.mock.calls).toEqual([
      [
        0,
        1000,
      ],
      [
        10,
        1010,
      ],
    ]);
  });

  test('stop cancels the frame asked for; a second call does nothing', () => {
    const clock = fakeFrames();
    const cancel = jest.spyOn(clock.frame, 'cancel');
    const callback = jest.fn();
    const stop = createAnimationFrame(callback, {
      frame: clock.frame,
    });
    expect(clock.pending.size).toBe(1);
    stop();
    expect(clock.pending.size).toBe(0);
    stop();
    expect(cancel).toHaveBeenCalledTimes(1);
    clock.tick(16);
    expect(callback).not.toHaveBeenCalled();
  });

  test('stopped from inside its own callback: no frame after', () => {
    const clock = fakeFrames();
    const calls: number[] = [];
    const stop = createAnimationFrame((delta) => {
      calls.push(delta);
      if (calls.length === 2) {
        stop();
      }
    }, {
      frame: clock.frame,
    });
    clock.tick(16);
    clock.tick(16);
    clock.tick(16);
    expect(calls).toEqual([
      0,
      16,
    ]);
    expect(clock.pending.size).toBe(0);
  });

  test('by default the browser\'s requestAnimationFrame / cancelAnimationFrame', () => {
    const request = jest.fn(() => 7);
    const cancel = jest.fn();
    const global = globalThis as Record<string, unknown>;
    global.requestAnimationFrame = request;
    global.cancelAnimationFrame = cancel;
    try {
      const callback = jest.fn();
      const stop = createAnimationFrame(callback);
      expect(request).toHaveBeenCalledTimes(1);
      (request.mock.calls[0] as unknown as [(time: number) => void])[0](100);
      expect(callback).toHaveBeenCalledWith(0, 0);
      expect(request).toHaveBeenCalledTimes(2);
      stop();
      expect(cancel).toHaveBeenCalledWith(7);
    } finally {
      delete global.requestAnimationFrame;
      delete global.cancelAnimationFrame;
    }
  });

  test('wrong options: an unknown key or a bad value — an error', () => {
    const clock = fakeFrames();
    expect(() => createAnimationFrame(() => undefined, {
      intreval: 10,
    } as never)).toThrow('[fundamentool] createAnimationFrame: unknown option "intreval". Did you mean "interval"?');
    expect(() => createAnimationFrame(() => undefined, {
      maxDelta: 0,
    })).toThrow(/maxDelta.*expects a number > 0, got number 0/);
    expect(() => createAnimationFrame(() => undefined, {
      interval: -1,
    })).toThrow(/interval/);
    expect(() => createAnimationFrame(() => undefined, {
      clamp: 'yes',
    } as never)).toThrow(/clamp.*true or false/);
    expect(() => createAnimationFrame(() => undefined, {
      time: Infinity,
    })).toThrow(/time/);
    expect(() => createAnimationFrame(() => undefined, {
      frame: {
        request: clock.frame.request,
      },
    } as never)).toThrow('"frame"."cancel" expects a function, got undefined');
    expect(() => createAnimationFrame(100 as never)).toThrow(/createAnimationFrame/);
    expect(() => createAnimationFrame(() => undefined, 100 as never)).toThrow(/an options object/);
    expect(clock.pending.size).toBe(0);
  });

  test('its options\' single key list', () => {
    expect(ANIMATION_FRAME_OPTIONS().keys).toEqual([
      'interval',
      'maxDelta',
      'clamp',
      'time',
      'frame',
    ]);
  });
});
