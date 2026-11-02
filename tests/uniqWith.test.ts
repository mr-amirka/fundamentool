import {
  uniqWith,
} from '../src/uniqWith';

describe('uniqWith', () => {
  test('removes duplicate primitives using default comparator', () => {
    expect(uniqWith([
      1,
      2,
      1,
      3,
      2,
    ])).toEqual([
      1,
      2,
      3,
    ]);
  });

  test('uses custom comparator', () => {
    const input = [
      {
        a: 1,
      },
      {
        a: 1,
      },
      {
        a: 2,
      },
    ];
    expect(uniqWith(input, (x, y) => x.a === y.a)).toEqual([
      {
        a: 1,
      },
      {
        a: 2,
      },
    ]);
  });

  test('handles null/undefined input', () => {
    expect(uniqWith(null)).toEqual([]);
    expect(uniqWith(undefined)).toEqual([]);
  });

  test('writes into provided output array', () => {
    const output: number[] = [0];
    uniqWith(
      [
        1,
        1,
        2,
      ], undefined, output,
    );
    expect(output).toEqual([
      0,
      1,
      2,
    ]);
  });

  test('the default comparator is deep equality, so the order doesn\'t matter (D-086)', () => {
    expect(uniqWith([
      {
        a: 1,
      },
      {
        a: 1,
        b: 1,
      },
    ])).toHaveLength(2);
    expect(uniqWith([
      {
        a: 1,
        b: 1,
      },
      {
        a: 1,
      },
    ])).toHaveLength(2);
    expect(uniqWith([
      {
        a: {
          b: [1],
        },
      },
      {
        a: {
          b: [1],
        },
      },
    ])).toEqual([
      {
        a: {
          b: [1],
        },
      },
    ]);
  });
});
