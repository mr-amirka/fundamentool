import {
  remove,
} from '../src/remove';

describe('remove', () => {
  test('removes property at path', () => {
    const obj = {
      a: {
        b: {
          c: 1,
        },
      },
    };
    remove(obj, 'a.b.c');
    expect(obj.a.b.c).toBeUndefined();
  });

  test('returns ctx when path empty', () => {
    const obj = {
      a: 1,
    };
    expect(remove(obj, '')).toBe(obj);
  });

  test('mutates the object', () => {
    const obj = {
      x: 1,
    };
    remove(obj, 'x');
    expect(obj).not.toHaveProperty('x');
  });
});

describe('remove — the context back, a path through nothing', () => {
  it('returns the context it changed (it returned undefined); a path through a value — untouched; no context — nothing', () => {
    const ctx = {
      a: {
        b: 1,
        c: 2,
      },
    };
    expect(remove(ctx, 'a.b')).toBe(ctx);
    expect(ctx).toEqual({
      a: {
        c: 2,
      },
    });
    const scalar = {
      a: 5,
    };
    expect(remove(scalar, 'a.b.c')).toBe(scalar);
    expect(scalar).toEqual({
      a: 5,
    });
    expect(remove(null, 'a')).toBeNull();
  });
});
