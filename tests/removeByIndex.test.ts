import { removeByIndex } from '../src/removeByIndex';
import { removeOf } from '../src/removeOf';

describe('removeByIndex', () => {
  test('removes single element at given index', () => {
    expect(removeByIndex([1, 2, 3, 4, 5], 2)).toEqual([1, 2, 4, 5]);
  });

  test('removes multiple elements starting at index', () => {
    expect(removeByIndex([1, 2, 3, 4, 5], 1, 3)).toEqual([1, 5]);
  });

  test('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    removeByIndex(arr, 0);
    expect(arr).toEqual([1, 2, 3]);
  });

  test('handles index at end', () => {
    expect(removeByIndex([1, 2, 3], 2)).toEqual([1, 2]);
  });

  test('handles index at start', () => {
    expect(removeByIndex([1, 2, 3], 0)).toEqual([2, 3]);
  });

  test('handles length = 0 (removes nothing beyond bounds)', () => {
    expect(removeByIndex([1, 2, 3], 1, 0)).toEqual([1, 2, 3]);
  });
});

describe('removeOf', () => {
  test('removes all occurrences of value', () => {
    const arr = [1, 2, 3, 2, 4];
    removeOf(arr, 2);
    expect(arr).toEqual([1, 3, 4]);
  });

  test('returns the count of removed elements', () => {
    const arr = [1, 2, 2, 3];
    expect(removeOf(arr, 2)).toBe(2);
  });

  test('does nothing when value not found', () => {
    const arr = [1, 2, 3];
    expect(removeOf(arr, 99)).toBe(0);
    expect(arr).toEqual([1, 2, 3]);
  });

  test('handles empty array', () => {
    expect(removeOf([], 1)).toBe(0);
  });
});
