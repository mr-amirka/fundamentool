import {
  withDefer, 
} from '../src/withDefer';

describe('withDefer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debounces multiple calls to a single execution', () => {
    const fn = jest.fn();
    const debounced = withDefer(fn);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('passes the last set of args to fn', () => {
    const fn = jest.fn();
    const debounced = withDefer(fn);

    debounced(1);
    debounced(2);
    debounced(3);

    jest.runAllTimers();
    expect(fn).toHaveBeenCalledWith(3);
  });

  test('returns the provided result value immediately', () => {
    const debounced = withDefer(
      jest.fn(), undefined, 'stub',
    );
    expect(debounced()).toBe('stub');
  });

  test('allows subsequent calls after the deferred fn runs', () => {
    const fn = jest.fn();
    const debounced = withDefer(fn);

    debounced();
    jest.runAllTimers();
    debounced();
    jest.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
