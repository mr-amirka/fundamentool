import {
  isPromise, 
} from '../../src/is/isPromise';

describe('isPromise', () => {
  test('returns true for Promise instances', () => {
    expect(isPromise(Promise.resolve())).toBe(true);
    expect(isPromise(new Promise(() => {}))).toBe(true);
  });

  test('returns true for thenables', () => {
    expect(isPromise({
      then: () => {}, 
    })).toBe(true);
  });

  test('returns false for non-thenables', () => {
    expect(isPromise({})).toBe(false);
    expect(isPromise(null)).toBe(false);
    expect(isPromise(undefined)).toBe(false);
    expect(isPromise(42)).toBe(false);
    expect(isPromise({
      then: 'not-a-function', 
    })).toBe(false);
  });
});
