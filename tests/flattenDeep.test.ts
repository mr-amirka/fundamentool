import {
  flattenDeep, 
} from '../src/flattenDeep';

describe('flattenDeep', () => {
  test('flattens nested arrays', () => {
    expect(flattenDeep([
      1,
      [2, 3],
      [4, [5, 6]],
    ])).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
    ]);
  });

  test('returns empty for empty input', () => {
    expect(flattenDeep([])).toEqual([]);
  });

  test('returns flat array as-is', () => {
    const arr = [
      1,
      2,
      3,
    ];
    expect(flattenDeep(arr)).toEqual([
      1,
      2,
      3,
    ]);
  });

  test('handles deeply nested', () => {
    expect(flattenDeep([
      [[]],
      [1],
      [[2, [3]]],
    ])).toEqual([
      1,
      2,
      3,
    ]);
  });
});
