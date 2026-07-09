import {
  hasOwn, 
} from '../src/hasOwn';

describe('hasOwn', () => {
  test('returns true for own property', () => {
    expect(hasOwn({
      a: 1, 
    }, 'a')).toBe(true);
  });

  test('returns false for inherited or missing', () => {
    expect(hasOwn({}, 'toString')).toBe(false);
    expect(hasOwn({
      a: 1, 
    }, 'b')).toBe(false);
  });
});
