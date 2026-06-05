import { findKey } from '../src/findKey';

describe('findKey', () => {
  test('returns first key matching predicate', () => {
    expect(findKey({ x: 1, y: 2, z: 3 }, v => v > 1)).toBe('y');
  });

  test('returns undefined when no key matches', () => {
    expect(findKey({ a: 1, b: 2 }, v => v > 100)).toBeUndefined();
  });

  test('returns undefined for empty object', () => {
    expect(findKey({}, () => true)).toBeUndefined();
  });
});
