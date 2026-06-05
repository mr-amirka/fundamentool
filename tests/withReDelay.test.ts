import { withReDelay } from '../src/withReDelay';

describe('withReDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls fn after the delay', () => {
    const fn = jest.fn();
    const debounced = withReDelay(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('resets delay on each new call', () => {
    const fn = jest.fn();
    const debounced = withReDelay(fn, 200);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancel() prevents pending execution', () => {
    const fn = jest.fn();
    const debounced = withReDelay(fn, 200);

    debounced();
    debounced.cancel();

    jest.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
  });

  test('allows calls after cancel', () => {
    const fn = jest.fn();
    const debounced = withReDelay(fn, 200);

    debounced();
    debounced.cancel();

    debounced();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
