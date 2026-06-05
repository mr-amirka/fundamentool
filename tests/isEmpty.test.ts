import { isEmpty } from '../src/is/isEmpty';

describe('isEmpty', () => {
  test('returns true for empty object', () => {
    expect(isEmpty({})).toBe(true);
  });

  test('returns false when has keys', () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });
});
