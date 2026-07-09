import {
  isCollection, 
} from '../../src/is/isCollection';

describe('isCollection', () => {
  test('returns true for arrays', () => {
    expect(isCollection([])).toBe(true);
    expect(isCollection([
      1,
      2,
      3,
    ])).toBe(true);
  });

  test('returns true for plain objects', () => {
    expect(isCollection({
      a: 1, 
    })).toBe(true);
    expect(isCollection({})).toBe(true);
  });

  test('returns true for array-like objects', () => {
    expect(isCollection({
      length: 3, 
    })).toBe(true);
  });

  test('returns false for primitives and null', () => {
    expect(isCollection(null)).toBe(false);
    expect(isCollection(undefined)).toBe(false);
    expect(isCollection('string')).toBe(false);
    expect(isCollection(42)).toBe(false);
  });

  test('returns false for non-plain objects without length', () => {
    expect(isCollection(new Date())).toBe(false);
  });
});
