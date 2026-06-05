import { removeOf } from '../src/removeOf';

describe('removeOf', () => {
  test('removes all occurrences of value in place', () => {
    const arr = [1, 2, 3, 2, 4];
    removeOf(arr, 2);
    expect(arr).toEqual([1, 3, 4]);
  });

  test('returns count of removed elements', () => {
    const arr = [1, 2, 2, 3];
    expect(removeOf(arr, 2)).toBe(2);
  });

  test('returns 0 when value not found', () => {
    const arr = [1, 2, 3];
    expect(removeOf(arr, 99)).toBe(0);
  });

  test('handles empty array', () => {
    const arr: number[] = [];
    expect(removeOf(arr, 1)).toBe(0);
  });
});
