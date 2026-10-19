import {
  nextFrame,
} from '../../src/browser/nextFrame';

describe('browser/nextFrame', () => {
  let frames: Map<number, (time: number) => void>;
  let id: number;

  beforeEach(() => {
    frames = new Map();
    id = 0;
    (global as any).requestAnimationFrame = (callback: (time: number) => void) => {
      frames.set(++id, callback);
      return id;
    };
    (global as any).cancelAnimationFrame = (handle: number) => {
      frames.delete(handle);
    };
  });

  /** Runs the frames asked for so far. */
  function frame(time: number): void {
    const due = [...frames.values()];
    frames.clear();
    due.forEach((callback) => callback(time));
  }

  test('runs the callback once, on the next frame, with its time', () => {
    const callback = jest.fn();
    nextFrame(callback);
    expect(callback).not.toHaveBeenCalled();
    frame(16);
    expect(callback).toHaveBeenCalledWith(16);
    frame(32);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('cancelled before the frame — never runs; cancelling after it does nothing', () => {
    const early = jest.fn();
    nextFrame(early)();
    frame(16);
    expect(early).not.toHaveBeenCalled();

    const late = jest.fn();
    const cancel = nextFrame(late);
    frame(32);
    const other = jest.fn();
    nextFrame(other);
    cancel(); // the frame has passed: the other request stays
    frame(48);
    expect(late).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(1);
  });
});
