import { providerOfIsClass } from '../src/providerOfIsClass';

class Foo {}
class Bar {}

describe('providerOfIsClass', () => {
  test('returns true for instance of the class', () => {
    const isFoo = providerOfIsClass(() => Foo);
    expect(isFoo(new Foo())).toBe(true);
  });

  test('returns false for instance of another class', () => {
    const isFoo = providerOfIsClass(() => Foo);
    expect(isFoo(new Bar())).toBe(false);
  });

  test('returns false for primitives', () => {
    const isFoo = providerOfIsClass(() => Foo);
    expect(isFoo(null)).toBe(false);
    expect(isFoo(42)).toBe(false);
    expect(isFoo('str')).toBe(false);
  });

  test('returns false when getter returns null', () => {
    const isClass = providerOfIsClass(() => null);
    expect(isClass(new Foo())).toBe(false);
  });
});
