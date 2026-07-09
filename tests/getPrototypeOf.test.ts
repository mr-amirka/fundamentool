import {
  getPrototypeOf, 
} from '../src/getPrototypeOf';

describe('getPrototypeOf', () => {
  test('returns Array.prototype for arrays', () => {
    expect(getPrototypeOf([])).toBe(Array.prototype);
  });

  test('returns Object.prototype for plain objects', () => {
    expect(getPrototypeOf({})).toBe(Object.prototype);
  });

  test('returns Function.prototype for functions', () => {
    expect(getPrototypeOf(() => {})).toBe(Function.prototype);
  });

  test('returns null for null-prototype objects', () => {
    expect(getPrototypeOf(Object.create(null))).toBeNull();
  });

  test('returns custom prototype for class instances', () => {
    class Foo {}
    expect(getPrototypeOf(new Foo())).toBe(Foo.prototype);
  });
});
