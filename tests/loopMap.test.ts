import { loopMap } from '../src/loopMap';

describe('loopMap', () => {
  test('maps indices to values using fn', () => {
    expect(loopMap(5, i => i * 2)).toEqual([0, 2, 4, 6, 8]);
  });

  test('returns empty array for length 0', () => {
    expect(loopMap(0, i => i)).toEqual([]);
  });

  test('writes into existing output array', () => {
    const output: number[] = new Array(3);
    loopMap(3, i => i + 10, output);
    expect(output).toEqual([10, 11, 12]);
  });
});
