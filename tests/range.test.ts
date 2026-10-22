import {
  range,
} from '../src/range';

describe('range', () => {
  test('single arg gives 0 to end-1', () => {
    expect(range(5)).toEqual([
      0,
      1,
      2,
      3,
      4,
    ]);
  });

  test('two args give start to end-1', () => {
    expect(range(5, 1)).toEqual([
      1,
      2,
      3,
      4,
    ]);
  });

  test('step', () => {
    expect(range(
      6, 0, 2,
    )).toEqual([
      0,
      2,
      4,
    ]);
  });
});

describe('range — a step that doesn\'t divide the span; descending; a zero or negative step', () => {
  it('rounds the length up', () => {
    expect(range(
      5, 0, 2,
    )).toEqual([
      0,
      2,
      4,
    ]);
    expect(range(0, 5)).toEqual([
      5,
      4,
      3,
      2,
      1,
    ]);
    expect(range(
      3, 0, 0,
    )).toEqual([
      0,
      1,
      2,
    ]);
    expect(range(
      4, 0, -2,
    )).toEqual([
      0,
      2,
    ]);
  });
});
