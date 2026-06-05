import { size } from '../src/size';

describe('size', () => {
  test('returns count of enumerable values', () => {
    expect(size({ a: 1, b: 2 })).toBe(2);
    expect(size([])).toBe(0);
  });

  test('null/undefined returns 0', () => {
    expect(size(null)).toBe(0);
    expect(size(undefined)).toBe(0);
  });
});
