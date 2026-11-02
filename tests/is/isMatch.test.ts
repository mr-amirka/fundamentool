import {
  isMatch,
} from '../../src/is/isMatch';

describe('isMatch', () => {
  test('returns true when src contains all keys of matchs with equal values', () => {
    expect(isMatch({
      a: 1,
      b: 2,
    }, {
      a: 1,
    })).toBe(true);
    expect(isMatch({
      a: 1,
      b: 2,
    }, {
      a: 1,
      b: 2,
    })).toBe(true);
  });

  test('returns false when a key value differs', () => {
    expect(isMatch({
      a: 1,
    }, {
      a: 2,
    })).toBe(false);
  });

  test('returns false when matchs has a key absent in src', () => {
    expect(isMatch({
      a: 1,
    }, {
      b: 1,
    })).toBe(false);
  });

  test('matches nested objects recursively', () => {
    expect(isMatch({
      a: {
        b: 1,
        c: 2,
      },
    }, {
      a: {
        b: 1,
      },
    })).toBe(true);
    expect(isMatch({
      a: {
        b: 1,
      },
    }, {
      a: {
        b: 2,
      },
    })).toBe(false);
  });

  test('returns true for identical primitives', () => {
    expect(isMatch(1, 1)).toBe(true);
    expect(isMatch('x', 'x')).toBe(true);
  });

  test.each<[string, unknown, unknown, boolean]>([
    [
      'two different Dates don\'t match (fixed, D-086)',
      new Date(1),
      new Date(2),
      false,
    ],
    [
      'two equal Dates match',
      new Date(1),
      new Date(1),
      true,
    ],
    [
      'null matches only null (fixed)',
      {
        a: {
          b: 1,
        },
      },
      {
        a: null,
      },
      false,
    ],
    [
      'NaN matches NaN (fixed)',
      NaN,
      NaN,
      true,
    ],
    [
      'a deep pattern is compared to its leaf (fixed: depth went)',
      {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: {
                    g: {
                      h: {
                        i: {
                          j: {
                            k: {
                              l: 1,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: {
                    g: {
                      h: {
                        i: {
                          j: {
                            k: {
                              l: 2,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      false,
    ],
    [
      'a list means any of its items (changed, Q2)',
      {
        tags: [
          'x',
          'y',
        ],
      },
      {
        tags: 'y',
      },
      true,
    ],
    [
      'a value on an array field: the array holds it (Q5)',
      {
        tags: [
          'x',
          'y',
        ],
      },
      {
        tags: 'x',
      },
      true,
    ],
    [
      'undefined in the pattern matches absent, as before',
      {},
      {
        a: undefined,
      },
      true,
    ],
  ])('%s', (
    _, value, pattern, expected,
  ) => {
    expect(isMatch(value, pattern as never)).toBe(expected);
  });

  test('an object pattern is compiled once and kept', () => {
    const pattern = {
      a: 1,
    };
    expect([
      isMatch({
        a: 1,
      }, pattern),
      isMatch({
        a: 2,
      }, pattern),
    ]).toEqual([
      true,
      false,
    ]);
  });

  test('a bad pattern throws, as matchProvider', () => {
    expect(() => isMatch({}, {
      a: {
        $inn: 1,
      },
    })).toThrow('unknown operator "$inn" at a. Did you mean "$in"?');
  });
});
