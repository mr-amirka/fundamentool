import {
  reduceIn, 
} from '../src/reduceIn';

describe('reduceIn', () => {
  test('reduces object properties to a single value', () => {
    expect(reduceIn(
      {
        a: 1,
        b: 2,
        c: 3, 
      }, (acc, v) => acc + v, 0,
    )).toBe(6);
  });

  test('collects keys into an array', () => {
    const keys = reduceIn(
      {
        x: 1,
        y: 2, 
      }, (
        acc, _, k,
      ) => [...acc, k], [],
    );
    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });

  test('returns initial accumulator for empty object', () => {
    expect(reduceIn(
      {}, (acc, v) => acc + v, 0,
    )).toBe(0);
  });
});
