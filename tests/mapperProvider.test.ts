import { mapperProvider } from '../src/mapperProvider';

describe('mapperProvider', () => {
  test('maps array to object by keys', () => {
    const mapper = mapperProvider(['name', 'age']);
    expect(mapper(['Vasya', 30])).toEqual({ name: 'Vasya', age: 30 });
  });
  test('without values returns dst or new object', () => {
    const mapper = mapperProvider(['a', 'b']);
    const dst = {};
    expect(mapper(undefined, dst)).toBe(dst);
    expect(mapper()).toEqual({});
  });
  test('undefined values are skipped', () => {
    const mapper = mapperProvider(['a', 'b', 'c']);
    expect(mapper([1, undefined, 3])).toEqual({ a: 1, c: 3 });
  });
});
