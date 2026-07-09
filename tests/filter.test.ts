import {
  filter, 
} from '../src/filter';
import {
  filterIn, 
} from '../src/filterIn';

describe('filter', () => {
  test('returns elements passing predicate', () => {
    expect(filter([
      1,
      2,
      3,
      4,
    ], (v) => v % 2 === 0)).toEqual([2, 4]);
  });

  test('passes index and collection to iteratee', () => {
    const calls: any[] = [];
    filter(['a', 'b'], (
      v, i, c,
    ) => {
      calls.push([
        v,
        i,
        c,
      ]); return true; 
    });
    expect(calls).toEqual([[
      'a',
      0,
      ['a', 'b'],
    ], [
      'b',
      1,
      ['a', 'b'],
    ]]);
  });

  test('returns empty array when nothing passes', () => {
    expect(filter([
      1,
      2,
      3,
    ], () => false)).toEqual([]);
  });

  test('writes into provided dst array', () => {
    const dst: number[] = [];
    filter(
      [
        1,
        2,
        3,
      ], (v) => v > 1, dst,
    );
    expect(dst).toEqual([2, 3]);
  });

  test('handles empty array', () => {
    expect(filter([], () => true)).toEqual([]);
  });
});

describe('filterIn', () => {
  test('returns object with entries passing predicate', () => {
    const result = filterIn({
      a: 1,
      b: 2,
      c: 3, 
    }, (v) => v > 1);
    expect(result).toEqual({
      b: 2,
      c: 3, 
    });
  });

  test('passes value, key, collection to iteratee', () => {
    const calls: any[] = [];
    filterIn({
      x: 10, 
    }, (
      v, k, c,
    ) => {
      calls.push([
        v,
        k,
        c,
      ]); return true; 
    });
    expect(calls).toEqual([[
      10,
      'x',
      {
        x: 10, 
      },
    ]]);
  });

  test('returns empty object when nothing passes', () => {
    expect(filterIn({
      a: 1, 
    }, () => false)).toEqual({});
  });

  test('writes into provided dst object', () => {
    const dst: Record<string, number> = {};
    filterIn(
      {
        a: 1,
        b: 2, 
      }, (v) => v > 1, dst,
    );
    expect(dst).toEqual({
      b: 2, 
    });
  });
});
