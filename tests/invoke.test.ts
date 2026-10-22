import {
  invoke,
} from '../src/invoke';

describe('invoke', () => {
  test('invokes method by string path', () => {
    const obj = {
      fn: (x: number) => x * 2,
    };
    expect(invoke(
      obj, 'fn', [5],
    )).toBe(10);
  });

  test('invokes deeply nested method', () => {
    const obj = {
      a: {
        b: {
          fn: (x: number) => x + 1,
        },
      },
    };
    expect(invoke(
      obj, 'a.b.fn', [10],
    )).toBe(11);
  });

  test('uses object as context', () => {
    const obj = {
      value: 42,
      getVal(this: any) {
        return this.value;
      },
    };
    expect(invoke(obj, 'getVal')).toBe(42);
  });

  test('returns undefined when method not found', () => {
    expect(invoke({}, 'missing')).toBeUndefined();
  });

  test('accepts custom context', () => {
    const ctx = {
      x: 100,
    };
    const obj = {
      fn: function(this: any) {
        return this.x;
      },
    };
    expect(invoke(
      obj, 'fn', [], ctx,
    )).toBe(100);
  });
});

describe('invoke — a path as a list', () => {
  it('a list of keys is taken as it is (no parsing)', () => {
    expect(invoke(
      {
        'a.b': {
          f: (x: number) => x * 2,
        },
      }, [
        'a.b',
        'f',
      ] as never, [5],
    )).toBe(10);
  });
});
