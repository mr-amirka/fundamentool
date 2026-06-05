import { isMatch } from '../../src/is/isMatch';

describe('isMatch', () => {
  test('returns true when src contains all keys of matchs with equal values', () => {
    expect(isMatch({ a: 1, b: 2 }, { a: 1 })).toBe(true);
    expect(isMatch({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  test('returns false when a key value differs', () => {
    expect(isMatch({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('returns false when matchs has a key absent in src', () => {
    expect(isMatch({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('matches nested objects recursively', () => {
    expect(isMatch({ a: { b: 1, c: 2 } }, { a: { b: 1 } })).toBe(true);
    expect(isMatch({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  test('returns true for identical primitives', () => {
    expect(isMatch(1, 1)).toBe(true);
    expect(isMatch('x', 'x')).toBe(true);
  });
});
