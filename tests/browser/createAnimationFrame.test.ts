import {
  createAnimationFrame,
} from '../../src/browser/createAnimationFrame';

describe('browser/createAnimationFrame', () => {
  let next: (() => void) | null;
  let now: number;

  beforeEach(() => {
    next = null;
    now = 1000;
    (global as any).requestAnimationFrame = (callback: () => void) => {
      next = callback;
      return 1;
    };
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  /** One frame, `ms` after the previous one. */
  function frame(ms: number): void {
    now += ms;
    const callback = next as () => void;
    next = null;
    callback();
  }

  test('every frame by default, with the time since the previous call', () => {
    const callback = jest.fn();
    createAnimationFrame(callback);
    frame(16);
    frame(17);
    expect(callback.mock.calls).toEqual([
      [16],
      [17],
    ]);
  });

  test('with an interval: frames accumulate until it is reached, then the callback gets the whole balance', () => {
    const callback = jest.fn();
    createAnimationFrame(callback, 100);
    frame(40);
    frame(40);
    expect(callback).not.toHaveBeenCalled();
    frame(40);
    expect(callback).toHaveBeenCalledWith(120);
    frame(50);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('stopped — no more calls, no more frames asked for', () => {
    const callback = jest.fn();
    const stop = createAnimationFrame(callback);
    stop();
    frame(16);
    expect(callback).not.toHaveBeenCalled();
    expect(next).toBeNull();
  });
});
