import { push } from '../src/push';

describe('push', () => {
  test('pushes multiple items into the array', () => {
    const arr = [1, 2];
    push(arr, 3, 4, 5);
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });

  test('returns the same array reference', () => {
    const arr = [1];
    expect(push(arr, 2)).toBe(arr);
  });

  test('does nothing when no items provided', () => {
    const arr = [1, 2];
    push(arr);
    expect(arr).toEqual([1, 2]);
  });
});
