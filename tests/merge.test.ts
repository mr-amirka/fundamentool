import {
  merge,
} from '../src/merge';

describe('merge', () => {
  test('merges plain objects in array', () => {
    const obj1 = {
      name: 'Vasya',
    };
    const obj2 = {
      age: 10,
      height: 170,
    };

    const dst = merge([
      obj1,
      obj2,
    ]);

    expect(dst).toEqual({
      name: 'Vasya',
      age: 10,
      height: 170,
    });
  });

  test('uses dst as base when provided', () => {
    const obj1 = {
      name: 'Vasya',
    };
    const obj2 = {
      age: 10,
    };
    const base: any = {
      country: 'RU',
    };

    const dst = merge([
      obj1,
      obj2,
    ], base);

    expect(dst).toBe(base);
    expect(dst).toEqual({
      country: 'RU',
      name: 'Vasya',
      age: 10,
    });
  });

  test('returns last defined scalar when no objects', () => {
    expect(merge([
      null,
      1,
      undefined,
      3,
    ])).toBe(3);
  });

  test('non-object mergingSrc returns itself or dst', () => {
    expect(merge(5)).toBe(5);
    expect(merge(5, 10)).toBe(10);
  });
});


describe('merge — sources that aren\'t objects', () => {
  it('a value that isn\'t an object: the target if there is one, else the value; in a list the last value wins over nothing', () => {
    expect(merge(5 as never, {
      a: 1,
    })).toEqual({
      a: 1,
    });
    expect(merge(5 as never)).toBe(5);
    expect(merge([
      undefined,
      3,
      undefined,
    ])).toBe(3);
    expect(merge([], 'kept' as never)).toBe('kept');
  });

  it('one object extends the target (a new one without it); asArray reads an array-like as a list', () => {
    const dst = {
      c: 3,
    };
    expect(merge({
      a: 1,
    }, dst)).toBe(dst);
    expect(dst).toEqual({
      c: 3,
      a: 1,
    });
    expect(merge({
      a: 1,
    })).toEqual({
      a: 1,
    });
    expect(merge(
      {
        0: {
          a: 1,
        },
        1: {
          b: 2,
        },
        length: 2,
      }, undefined, true,
    )).toEqual({
      a: 1,
      b: 2,
    });
  });
});
