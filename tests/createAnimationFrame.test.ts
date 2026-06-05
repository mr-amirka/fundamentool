import { createAnimationFrame } from '../src/createAnimationFrame';

describe('createAnimationFrame', () => {
  let rafId: number;
  let rafCb: (() => void) | null;

  beforeEach(() => {
    rafId = 0;
    rafCb = null;
    global.requestAnimationFrame = jest.fn((cb: () => void) => {
      rafCb = cb;
      return ++rafId;
    });
  });

  test('calls callback when interval elapsed', () => {
    const fn = jest.fn();
    createAnimationFrame(fn, 100);
    expect(rafCb).toBeDefined();
    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start + 150);
    rafCb!();
    expect(fn).toHaveBeenCalled();
  });

  test('stop cancels further callbacks', () => {
    const fn = jest.fn();
    const stop = createAnimationFrame(fn, 100);
    stop();
    if (rafCb) rafCb();
    expect(fn).not.toHaveBeenCalled();
  });
});
