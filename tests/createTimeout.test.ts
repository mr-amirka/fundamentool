import {
  createTimeout, 
} from '../src/createTimeout';

describe('createTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('invokes callback after timeout', () => {
    const fn = jest.fn();
    createTimeout(fn, 100);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('cancel prevents callback', () => {
    const fn = jest.fn();
    const cancel = createTimeout(fn, 100);
    cancel();
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  test('passes args and ctx', () => {
    const fn = jest.fn();
    const ctx = {
      x: 1, 
    };
    createTimeout(
      fn, 50, ['a', 'b'], ctx,
    );
    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('a', 'b');
    expect(fn).toHaveBeenLastCalledWith('a', 'b');
  });
});
