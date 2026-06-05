import { merge } from '../src/merge';

describe('merge', () => {
  test('merges plain objects in array', () => {
    const obj1 = { name: 'Vasya' };
    const obj2 = { age: 10, height: 170 };

    const dst = merge([obj1, obj2]);

    expect(dst).toEqual({
      name: 'Vasya',
      age: 10,
      height: 170,
    });
  });

  test('uses dst as base when provided', () => {
    const obj1 = { name: 'Vasya' };
    const obj2 = { age: 10 };
    const base: any = { country: 'RU' };

    const dst = merge([obj1, obj2], base);

    expect(dst).toBe(base);
    expect(dst).toEqual({
      country: 'RU',
      name: 'Vasya',
      age: 10,
    });
  });

  test('returns last defined scalar when no objects', () => {
    expect(merge([null, 1, undefined, 3])).toBe(3);
  });

  test('non-object mergingSrc returns itself or dst', () => {
    expect(merge(5)).toBe(5);
    expect(merge(5, 10)).toBe(10);
  });
});

