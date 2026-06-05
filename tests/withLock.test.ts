import { withLock } from '../src/withLock';

describe('withLock', () => {
  test('allows first call to proceed', () => {
    const fn = jest.fn();
    const locked = withLock(fn);
    locked();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('ignores re-entrant calls from within fn', () => {
    let callCount = 0;
    let inner: (() => void) | undefined;

    const locked = withLock(function() {
      callCount++;
      if (callCount === 1) {
        inner?.();
      }
    });

    inner = locked;
    locked(); // first call triggers inner() which is blocked
    expect(callCount).toBe(1);
  });

  test('returns result value for ignored calls', () => {
    const fn = withLock(() => {}, null, 'busy');
    fn();
    expect(fn()).toBe('busy');
  });
});
