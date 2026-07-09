import {
  each, 
} from '../src/each';

describe('each', () => {
  test('iterates over array elements with index', () => {
    const result: [number, number][] = [];
    each([
      10,
      20,
      30,
    ], (v, i) => result.push([i as number, v]));
    expect(result).toEqual([
      [0, 10],
      [1, 20],
      [2, 30],
    ]);
  });

  test('iterates over object properties', () => {
    const result: [string, number][] = [];
    each({
      a: 1,
      b: 2, 
    }, (v, k) => result.push([k as string, v]));
    expect(result).toContainEqual(['a', 1]);
    expect(result).toContainEqual(['b', 2]);
  });
});
