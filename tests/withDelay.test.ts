import { withDelay } from '../src/withDelay';

jest.useFakeTimers();

describe('withDelay', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('executes fn only once after delay window', () => {
    const fn = jest.fn();
    const debounced = withDelay(fn, 100);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('passes the last call arguments', () => {
    const fn = jest.fn();
    const debounced = withDelay(fn, 100);
    debounced('first');
    debounced('last');
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('last');
  });

  test('returns the result value on each call', () => {
    const debounced = withDelay(jest.fn(), 100, null, 'pending');
    expect(debounced()).toBe('pending');
  });
});
