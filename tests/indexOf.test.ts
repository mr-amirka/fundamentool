import {
  indexOf, 
} from '../src/indexOf';

describe('indexOf', () => {
  test('returns index of element', () => {
    expect(indexOf([
      1,
      2,
      3,
    ], 2)).toBe(1);
    expect(indexOf([
      'a',
      'b',
      'c',
    ], 'b')).toBe(1);
  });

  test('returns -1 when not found', () => {
    expect(indexOf([
      1,
      2,
      3,
    ], 4)).toBe(-1);
  });

  test('works with array-like', () => {
    const like = {
      0: 'x',
      1: 'y',
      length: 2, 
    };
    expect(indexOf(like, 'y')).toBe(1);
  });
});
