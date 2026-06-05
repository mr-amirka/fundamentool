import { isInsign } from '../../src/is/isInsign';

describe('isInsign', () => {
  test('returns true for null and undefined', () => {
    expect(isInsign(null)).toBe(true);
    expect(isInsign(undefined)).toBe(true);
  });

  test('returns true for empty array', () => {
    expect(isInsign([])).toBe(true);
  });

  test('returns true for empty plain object', () => {
    expect(isInsign({})).toBe(true);
  });

  test('returns false for 0 (special case)', () => {
    expect(isInsign(0)).toBe(false);
  });

  test('returns false for non-empty collections', () => {
    expect(isInsign([1])).toBe(false);
    expect(isInsign({ a: 1 })).toBe(false);
  });

  test('returns false for non-object truthy values', () => {
    expect(isInsign('text')).toBe(false);
    expect(isInsign(42)).toBe(false);
  });
});
