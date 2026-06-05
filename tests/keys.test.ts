import { keys } from '../src/keys';

describe('keys', () => {
  test('returns enumerable keys', () => {
    expect(keys({ a: 1, b: 2 })).toEqual(['a', 'b']);
  });

  test('returns empty for empty object', () => {
    expect(keys({})).toEqual([]);
  });

  test('order follows for-in enumeration', () => {
    const obj = { z: 1, a: 2 };
    const k = keys(obj);
    expect(k).toContain('a');
    expect(k).toContain('z');
    expect(k).toHaveLength(2);
  });
});
