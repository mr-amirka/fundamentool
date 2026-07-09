import {
  noop, 
} from '../src/noop';

describe('noop', () => {
  test('is a function', () => {
    expect(typeof noop).toBe('function');
  });

  test('returns undefined', () => {
    expect(noop()).toBe(undefined);
  });

  test('accepts any arguments without error', () => {
    expect(() => (noop as any)(
      1, 2, 3,
    )).not.toThrow();
  });
});
