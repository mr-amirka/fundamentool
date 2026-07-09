import {
  last, 
} from '../src/last';

describe('last', () => {
  test('returns last element of array', () => {
    expect(last([
      1,
      2,
      3,
    ])).toBe(3);
    expect(last(['a', 'b'])).toBe('b');
  });

  test('returns undefined for empty', () => {
    expect(last([])).toBeUndefined();
  });

  test('works with array-like', () => {
    const like = {
      0: 10,
      1: 20,
      length: 2, 
    };
    expect(last(like)).toBe(20);
  });
});
