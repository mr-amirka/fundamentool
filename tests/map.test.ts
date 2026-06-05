import { map } from '../src/map';
import { mapIn } from '../src/mapIn';

describe('map', () => {
  test('maps each element with iteratee', () => {
    expect(map([1, 2, 3], (v) => v * 2)).toEqual([2, 4, 6]);
  });

  test('passes index and collection to iteratee', () => {
    const calls: any[] = [];
    map(['a', 'b'], (v, i, c) => { calls.push([v, i]); return v; });
    expect(calls).toEqual([['a', 0], ['b', 1]]);
  });

  test('writes into provided dst array', () => {
    const dst: number[] = [];
    map([1, 2], (v) => v + 10, dst);
    expect(dst).toEqual([11, 12]);
  });

  test('returns empty array for empty input', () => {
    expect(map([], (v) => v)).toEqual([]);
  });
});

describe('mapIn', () => {
  test('maps each value of an object', () => {
    expect(mapIn({ a: 1, b: 2 }, (v) => v * 3)).toEqual({ a: 3, b: 6 });
  });

  test('passes value, key, collection to iteratee', () => {
    const calls: any[] = [];
    mapIn({ x: 5 }, (v, k, c) => { calls.push([v, k]); return v; });
    expect(calls).toEqual([[5, 'x']]);
  });

  test('writes into provided dst object', () => {
    const dst: Record<string, number> = {};
    mapIn({ a: 1 }, (v) => v + 100, dst);
    expect(dst).toEqual({ a: 101 });
  });
});
