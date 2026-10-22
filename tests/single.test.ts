import {
  single,
} from '../src/single';

describe('single', () => {
  test('calls the wrapped function', () => {
    const fn = jest.fn();
    const s = single(fn);
    s();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancels previous call result when invoked again', () => {
    const cancelled: string[] = [];
    const fn = jest.fn(() => () => cancelled.push('cancelled'));
    const s = single(fn);
    s();
    s(); // should cancel previous and call fn again
    expect(fn).toHaveBeenCalledTimes(2);
    expect(cancelled).toContain('cancelled');
  });

  test('exposes a cancel method', () => {
    const fn = jest.fn(() => jest.fn());
    const s = single(fn);
    s();
    expect(typeof s.cancel).toBe('function');
    s.cancel();
  });
});

describe('single — what the last call left is cancelled', () => {
  it('a function it returned is called; a promise with cancel() is cancelled; anything else is left', () => {
    const stop = jest.fn();
    const cancelled = jest.fn();
    const results: unknown[] = [
      stop,
      Object.assign(Promise.resolve(), {
        cancel: cancelled,
      }),
      Promise.resolve(),
      'plain',
    ];
    const s = single(() => results.shift());
    s(); // returns stop
    s(); // the last one's stop called
    expect(stop).toHaveBeenCalledTimes(1);
    s(); // the promise with cancel cancelled
    expect(cancelled).toHaveBeenCalledTimes(1);
    s(); // a plain promise: nothing to call
    s.cancel(); // a plain value: nothing
    s.cancel(); // nothing left
  });
});
