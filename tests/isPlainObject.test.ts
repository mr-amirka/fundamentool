import { isPlainObject, isPlainObjectBase } from '../src/is/isPlainObject';

describe('isPlainObject', () => {
  test('returns true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  test('returns false for Array, Date, etc', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe('isPlainObjectBase', () => {
  test('plain object', () => {
    expect(isPlainObjectBase({})).toBe(true);
  });
});
