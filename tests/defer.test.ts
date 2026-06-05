import { defer } from '../src/defer';

describe('defer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls function after current tick', async () => {
    const fn = jest.fn();
    defer(fn);
    expect(fn).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('passes args to function', () => {
    const fn = jest.fn();
    defer(fn, [1, 2, 3]);
    jest.runAllTimers();
    expect(fn).toHaveBeenCalledWith(1, 2, 3);
  });

  test('passes ctx to function', () => {
    const ctx = { x: 42 };
    let capturedThis: any;
    const fn = function (this: any) {
      capturedThis = this;
    };
    defer(fn, [], ctx);
    jest.runAllTimers();
    expect(capturedThis).toBe(ctx);
  });

  test('returned cancel prevents execution', () => {
    const fn = jest.fn();
    const cancel = defer(fn);
    cancel();
    jest.runAllTimers();
    expect(fn).not.toHaveBeenCalled();
  });
});
