import { createInterval } from '../src/createInterval';

describe('createInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('invokes callback repeatedly after delay', () => {
    const fn = jest.fn();
    createInterval(fn, 100);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('cancel stops further invocations', () => {
    const fn = jest.fn();
    const cancel = createInterval(fn, 100);
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    cancel();
    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
