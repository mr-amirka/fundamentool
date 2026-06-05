import { range } from '../src/range';

describe('range', () => {
  test('single arg gives 0 to end-1', () => {
    expect(range(5)).toEqual([0, 1, 2, 3, 4]);
  });

  test('two args give start to end-1', () => {
    expect(range(5, 1)).toEqual([1, 2, 3, 4]);
  });

  test('step', () => {
    expect(range(6, 0, 2)).toEqual([0, 2, 4]);
  });
});
