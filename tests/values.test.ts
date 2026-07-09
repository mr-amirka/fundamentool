import {
  values, 
} from '../src/values';

describe('values', () => {
  test('returns enumerable values', () => {
    expect(values({
      a: 1,
      b: 2, 
    })).toEqual([1, 2]);
  });

  test('returns empty for null/undefined', () => {
    expect(values(null)).toEqual([]);
    expect(values(undefined)).toEqual([]);
  });

  test('returns empty for empty object', () => {
    expect(values({})).toEqual([]);
  });
});
