import { remove } from '../src/remove';

describe('remove', () => {
  test('removes property at path', () => {
    const obj = { a: { b: { c: 1 } } };
    remove(obj, 'a.b.c');
    expect(obj.a.b.c).toBeUndefined();
  });

  test('returns ctx when path empty', () => {
    const obj = { a: 1 };
    expect(remove(obj, '')).toBe(obj);
  });

  test('mutates the object', () => {
    const obj = { x: 1 };
    remove(obj, 'x');
    expect(obj).not.toHaveProperty('x');
  });
});
