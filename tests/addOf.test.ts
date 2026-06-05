import { addOf } from '../src/addOf';

describe('addOf', () => {
  test('adds item when not present', () => {
    const arr = [1, 2];
    addOf(arr, 3);
    expect(arr).toEqual([1, 2, 3]);
  });

  test('does not add item when already present', () => {
    const arr = [1, 2, 3];
    addOf(arr, 2);
    expect(arr).toEqual([1, 2, 3]);
  });

  test('returns the same array', () => {
    const arr = [1];
    expect(addOf(arr, 2)).toBe(arr);
  });

  test('works with strings', () => {
    const arr = ['a', 'b'];
    addOf(arr, 'a');
    expect(arr).toEqual(['a', 'b']);
    addOf(arr, 'c');
    expect(arr).toEqual(['a', 'b', 'c']);
  });

  test('works on empty array', () => {
    expect(addOf([], 1)).toEqual([1]);
  });
});
