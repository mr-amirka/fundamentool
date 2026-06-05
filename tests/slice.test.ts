import { slice } from '../src/slice';

describe('slice', () => {
  test('returns copy of array with no args', () => {
    const arr = [1, 2, 3];
    const result = slice(arr);
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(arr);
  });

  test('slices from start index', () => {
    expect(slice([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });

  test('slices with start and end', () => {
    expect(slice([1, 2, 3, 4], 1, 3)).toEqual([2, 3]);
  });

  test('works with array-like', () => {
    const like = { 0: 'a', 1: 'b', 2: 'c', length: 3 };
    expect(slice(like, 1)).toEqual(['b', 'c']);
  });
});
