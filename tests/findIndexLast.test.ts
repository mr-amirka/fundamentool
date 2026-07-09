import {
  findIndexLast, 
} from '../src/findIndexLast';

describe('findIndexLast', () => {
  test('returns index of last matching element', () => {
    expect(findIndexLast([
      1,
      2,
      3,
      2,
    ], v => v === 2)).toBe(3);
  });

  test('returns -1 when no element matches', () => {
    expect(findIndexLast([
      1,
      2,
      3,
    ], v => v > 100)).toBe(-1);
  });

  test('returns -1 for empty array', () => {
    expect(findIndexLast([], () => true)).toBe(-1);
  });

  test('searches from the end', () => {
    const visited: number[] = [];
    findIndexLast([
      1,
      2,
      3,
    ], (_, i) => {
      visited.push(i); return false; 
    });
    expect(visited).toEqual([
      2,
      1,
      0,
    ]);
  });
});
