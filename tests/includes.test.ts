import { includes } from '../src/includes';

describe('includes', () => {
  test('returns true when element present', () => {
    expect(includes([1, 2, 3], 2)).toBe(true);
  });

  test('returns false when element absent', () => {
    expect(includes([1, 2, 3], 4)).toBe(false);
  });

  test('returns false for null/undefined collection', () => {
    expect(includes(null, 1)).toBe(false);
    expect(includes(undefined, 1)).toBe(false);
  });
});
