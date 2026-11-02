import {
  isEqual,
} from '../../src/is/isEqual';

describe('isEqual', () => {
  test('returns true for identical primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual('a', 'a')).toBe(true);
    expect(isEqual(null, null)).toBe(true);
  });

  test('returns false for different primitives', () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('a', 'b')).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
  });

  test('compares shallow object keys at depth 0 (default)', () => {
    expect(isEqual({
      a: 1,
    }, {
      a: 1,
    })).toBe(true);
    expect(isEqual({
      a: 1,
    }, {
      a: 2,
    })).toBe(false);
  });

  test('compares nested objects by reference at depth 0', () => {
    expect(isEqual({
      a: {},
    }, {
      a: {},
    })).toBe(false);
  });

  test('recurses into nested objects at depth >= 1', () => {
    expect(isEqual(
      {
        a: {
          b: 1,
        },
      }, {
        a: {
          b: 1,
        },
      }, 1,
    )).toBe(true);
    expect(isEqual(
      {
        a: {
          b: 1,
        },
      }, {
        a: {
          b: 2,
        },
      }, 1,
    )).toBe(false);
  });

  test('returns false when key sets differ', () => {
    expect(isEqual({
      a: 1,
    }, {
      a: 1,
      b: 2,
    })).toBe(false);
    expect(isEqual({
      a: 1,
      b: 2,
    }, {
      a: 1,
    })).toBe(false);
  });

  test.each<[string, unknown, unknown, boolean]>([
    [
      'NaN equals NaN (D-086)',
      NaN,
      NaN,
      true,
    ],
    [
      'Dates by time',
      new Date(1),
      new Date(1),
      true,
    ],
    [
      'different Dates',
      new Date(1),
      new Date(2),
      false,
    ],
    [
      'a Date and an object',
      new Date(1),
      {},
      false,
    ],
    [
      'RegExps by source and flags',
      /a/i,
      /a/i,
      true,
    ],
    [
      'different RegExps',
      /a/i,
      /a/g,
      false,
    ],
    [
      'a RegExp and an object',
      {},
      /a/,
      false,
    ],
  ])('%s', (
    _, a, b, expected,
  ) => {
    expect(isEqual(a, b)).toBe(expected);
  });

  test('a Date compares by time at any depth: it is a value, not a container', () => {
    expect(isEqual({
      d: new Date(1),
    }, {
      d: new Date(1),
    })).toBe(true);
    expect(isEqual({
      d: new Date(1),
    }, {
      d: new Date(2),
    })).toBe(false);
  });
});
