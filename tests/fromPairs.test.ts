import { fromPairs } from '../src/fromPairs';

describe('fromPairs', () => {
  test('converts entries to object', () => {
    expect(fromPairs([['a', 1], ['b', 2]])).toEqual({ a: 1, b: 2 });
  });

  test('writes into dst when provided', () => {
    const dst = { x: 0 };
    expect(fromPairs([['a', 1]], dst)).toBe(dst);
    expect(dst).toEqual({ x: 0, a: 1 });
  });

  test('null/undefined entries returns empty or dst', () => {
    expect(fromPairs(null)).toEqual({});
    expect(fromPairs(undefined, {})).toEqual({});
  });
});
