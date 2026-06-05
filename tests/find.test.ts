import { find } from '../src/find';
import { findIn } from '../src/findIn';
import { findIndex } from '../src/findIndex';
import { findIndexLast } from '../src/findIndexLast';
import { findKey } from '../src/findKey';

describe('find', () => {
  test('returns first matching element', () => {
    expect(find([1, 2, 3], (v) => v > 1)).toBe(2);
  });

  test('returns undefined when not found', () => {
    expect(find([1, 2, 3], (v) => v > 10)).toBeUndefined();
  });

  test('passes index and collection to iteratee', () => {
    const calls: any[] = [];
    find(['a', 'b'], (v, i, c) => { calls.push([v, i]); return false; });
    expect(calls).toEqual([['a', 0], ['b', 1]]);
  });
});

describe('findIn', () => {
  test('returns first matching value in object', () => {
    expect(findIn({ a: 1, b: 2, c: 3 }, (v) => v === 2)).toBe(2);
  });

  test('returns undefined when not found', () => {
    expect(findIn({ a: 1 }, (v) => v === 99)).toBeUndefined();
  });
});

describe('findIndex', () => {
  test('returns index of first matching element', () => {
    expect(findIndex([1, 2, 3], (v) => v === 2)).toBe(1);
  });

  test('returns -1 when not found', () => {
    expect(findIndex([1, 2, 3], (v) => v === 99)).toBe(-1);
  });

  test('returns index 0 for first element', () => {
    expect(findIndex([5, 10], (v) => v === 5)).toBe(0);
  });
});

describe('findIndexLast', () => {
  test('returns index of last matching element', () => {
    expect(findIndexLast([1, 2, 2, 3], (v) => v === 2)).toBe(2);
  });

  test('returns -1 when not found', () => {
    expect(findIndexLast([1, 2, 3], (v) => v === 99)).toBe(-1);
  });
});

describe('findKey', () => {
  test('returns key of first matching value', () => {
    const result = findKey({ a: 1, b: 2, c: 3 }, (v) => v === 2);
    expect(result).toBe('b');
  });

  test('returns undefined when not found', () => {
    expect(findKey({ a: 1 }, (v) => v === 99)).toBeUndefined();
  });
});
