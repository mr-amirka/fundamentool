import {
  isStandardObject, 
} from '../../src/is/isStandardObject';

describe('isStandardObject', () => {
  test('returns true for plain objects and arrays', () => {
    expect(isStandardObject({})).toBe(true);
    expect(isStandardObject({
      a: 1, 
    })).toBe(true);
    expect(isStandardObject([])).toBe(true);
    expect(isStandardObject([1, 2])).toBe(true);
  });

  test('returns false for class instances', () => {
    expect(isStandardObject(new Date())).toBe(false);
    expect(isStandardObject(/rx/)).toBe(false);
  });

  test('returns false for primitives and null', () => {
    expect(isStandardObject(null)).toBe(false);
    expect(isStandardObject(undefined)).toBe(false);
    expect(isStandardObject(42)).toBe(false);
    expect(isStandardObject('str')).toBe(false);
  });
});
