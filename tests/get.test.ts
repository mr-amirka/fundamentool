import {
  get,
  getBase,
  getWithContext,
} from '../src/get';

describe('get', () => {
  test('gets value by dot path string', () => {
    const obj = {
      a: {
        b: {
          c: 42,
        },
      },
    };
    expect(get(obj, 'a.b.c')).toBe(42);
  });

  test('accepts number as single segment', () => {
    const obj = {
      0: 'zero',
      1: 'one',
    };
    expect(get(obj, 1)).toBe('one');
  });

  test('returns undefined for missing path', () => {
    const obj = {
      a: {},
    };
    expect(get(obj, 'a.b.c')).toBeUndefined();
  });

  test('returns undefined for null/undefined scope', () => {
    expect(get(null, 'a.b')).toBeUndefined();
    expect(get(undefined, 'a')).toBeUndefined();
  });
});

describe('getBase', () => {
  test('returns value at path', () => {
    const obj = {
      x: {
        y: 7,
      },
    };
    expect(getBase(obj, [
      'x',
      'y',
    ])).toBe(7);
  });

  test('returns undefined when path not found', () => {
    expect(getBase({}, [
      'a',
      'b',
    ])).toBeUndefined();
  });
});

describe('getWithContext', () => {
  test('returns [parent, value] when path exists', () => {
    const obj = {
      a: {
        b: 99,
      },
    };
    const result = getWithContext(obj, [
      'a',
      'b',
    ]);
    expect(result).not.toBeNull();
    expect(result![0]).toEqual({
      b: 99,
    });
    expect(result![1]).toBe(99);
  });

  test('returns null when path is incomplete', () => {
    const obj = {
      a: {},
    };
    expect(getWithContext(obj, [
      'a',
      'b',
      'c',
    ])).toBeNull();
  });
});

describe('get — a list\'s last item, a path that stops early', () => {
  it('`[]` is the last item (an empty list — the first slot); a path through nothing is undefined; getWithContext — null', () => {
    expect(get({
      a: [
        1,
        2,
        3,
      ],
    }, 'a[]')).toBe(3);
    expect(get({
      a: [],
    }, 'a[]')).toBeUndefined();
    expect(get({
      a: null,
    }, 'a.b')).toBeUndefined();
    expect(getWithContext({
      a: 1,
    }, [
      'a',
      'b',
      'c',
    ])).toBeNull();
    const list = [
      {
        n: 1,
      },
    ];
    expect(getWithContext({
      list,
    }, [
      'list',
      '[]',
    ])).toEqual([
      list,
      list[0],
    ]);
  });
});
