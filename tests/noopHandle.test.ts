import { noopHandle } from '../src/noopHandle';

describe('noopHandle', () => {
  test('returns the same value unchanged', () => {
    expect(noopHandle(42)).toBe(42);
    expect(noopHandle('hello')).toBe('hello');
    expect(noopHandle(null)).toBe(null);
    expect(noopHandle(undefined)).toBe(undefined);
  });

  test('returns the same object reference', () => {
    const obj = { a: 1 };
    expect(noopHandle(obj)).toBe(obj);
  });
});
