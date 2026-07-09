import {
  pushArray, 
} from '../src/pushArray';

describe('pushArray', () => {
  test('appends all elements from src to dst', () => {
    const dst = [1, 2];
    const src = [3, 4];
    const result = pushArray(dst, src);
    expect(result).toBe(dst);
    expect(dst).toEqual([
      1,
      2,
      3,
      4,
    ]);
  });

  test('handles empty src', () => {
    const dst = [1, 2];
    pushArray(dst, []);
    expect(dst).toEqual([1, 2]);
  });

  test('handles array-like src', () => {
    const dst: number[] = [];
    const src = {
      0: 10,
      1: 20,
      length: 2, 
    };
    pushArray(dst, src);
    expect(dst).toEqual([10, 20]);
  });
});
