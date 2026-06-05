import { findIndex } from '../src/findIndex';

describe('findIndex', () => {
  test('returns index of first matching element', () => {
    expect(findIndex([10, 20, 30], v => v > 15)).toBe(1);
  });

  test('returns -1 when no element matches', () => {
    expect(findIndex([1, 2, 3], v => v > 100)).toBe(-1);
  });

  test('returns -1 for empty array', () => {
    expect(findIndex([], () => true)).toBe(-1);
  });

  test('passes index and collection to iteratee', () => {
    const indices: number[] = [];
    findIndex([10, 20], (_, i) => { indices.push(i); return false; });
    expect(indices).toEqual([0, 1]);
  });
});
