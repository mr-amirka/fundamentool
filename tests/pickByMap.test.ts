import { pickByMap } from '../src/pickByMap';

describe('pickByMap', () => {
  test('picks only keys marked truthy in map', () => {
    const result = pickByMap({ a: 1, b: 2, c: 3 }, { a: true, c: true });
    expect(result).toEqual({ a: 1, c: 3 });
  });

  test('excludes keys with falsy values in map', () => {
    const result = pickByMap({ a: 1, b: 2 }, { a: false, b: true });
    expect(result).toEqual({ b: 2 });
  });

  test('skips undefined source values', () => {
    const result = pickByMap({ a: 1, b: undefined as any }, { a: true, b: true });
    expect(result).toEqual({ a: 1 });
    expect('b' in result).toBe(false);
  });

  test('writes into provided dst object', () => {
    const dst = { z: 99 } as any;
    const result = pickByMap({ a: 1, b: 2 }, { a: true }, dst);
    expect(result).toBe(dst);
    expect(result).toEqual({ z: 99, a: 1 });
  });

  test('returns empty object when map has no truthy keys', () => {
    const result = pickByMap({ a: 1, b: 2 }, { a: false });
    expect(result).toEqual({});
  });

  test('returns empty object for empty source', () => {
    const result = pickByMap({}, { a: true });
    expect(result).toEqual({});
  });
});
