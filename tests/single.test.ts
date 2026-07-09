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
