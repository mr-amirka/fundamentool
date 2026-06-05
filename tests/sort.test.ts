import { sort } from '../src/sort';
import { sortBy } from '../src/sortBy';
import { uniqWith } from '../src/uniqWith';

describe('sort', () => {
  test('sorts array in ascending order by default', () => {
    expect(sort([3, 1, 2])).toEqual([1, 2, 3]);
  });

  test('sorts with custom comparator', () => {
    expect(sort([3, 1, 2], (a, b) => b - a)).toEqual([3, 2, 1]);
  });

  test('returns the same array (mutates)', () => {
    const arr = [2, 1];
    expect(sort(arr)).toBe(arr);
  });

  test('handles empty array', () => {
    expect(sort([])).toEqual([]);
  });
});

describe('sortBy', () => {
  test('sorts by iteratee result ascending', () => {
    const users = [{ name: 'John' }, { name: 'Alice' }, { name: 'Bob' }];
    expect(sortBy(users, (u) => u.name)).toEqual([
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'John' },
    ]);
  });

  test('sorts numbers by iteratee', () => {
    expect(sortBy([3, 1, 2], (v) => v)).toEqual([1, 2, 3]);
  });

  test('handles stable equal values', () => {
    const result = sortBy([{ k: 1, v: 'b' }, { k: 1, v: 'a' }], (i) => i.k);
    expect(result.map((i) => i.k)).toEqual([1, 1]);
  });
});

describe('uniqWith', () => {
  test('removes duplicate primitives', () => {
    expect(uniqWith([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  test('removes duplicate objects with custom comparator', () => {
    const result = uniqWith([{ a: 1 }, { a: 1 }, { a: 2 }], (x, y) => x.a === y.a);
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  test('returns empty array for null input', () => {
    expect(uniqWith(null)).toEqual([]);
  });

  test('writes into provided output array', () => {
    const out: number[] = [];
    uniqWith([1, 2, 1], undefined, out);
    expect(out).toEqual([1, 2]);
  });
});
