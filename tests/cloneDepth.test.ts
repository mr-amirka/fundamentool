import { cloneDepth } from '../src/cloneDepth';

describe('cloneDepth', () => {
  test('depth 0 creates a shallow clone of the top-level object', () => {
    const inner = { b: 2 };
    const obj = { a: inner };
    const result = cloneDepth(obj, 0);
    expect(result).not.toBe(obj);
    expect(result.a).toBe(inner); // nested object is NOT cloned
  });

  test('depth 1 also clones one level of nested objects', () => {
    const inner = { b: 2 };
    const obj = { a: inner };
    const result = cloneDepth(obj, 1);
    expect(result).not.toBe(obj);
    expect(result.a).not.toBe(inner); // nested object IS cloned
    expect(result).toEqual({ a: { b: 2 } });
  });

  test('depth 2 clones two levels deep', () => {
    const obj = { a: { b: { c: 3 } } };
    const result = cloneDepth(obj, 2);
    expect(result.a).not.toBe(obj.a);
    expect(result.a.b).not.toBe(obj.a.b);
    expect(result.a.b.c).toBe(3);
  });

  test('clones arrays at depth 0 (new array, same elements)', () => {
    const inner = [2, 3];
    const arr = [1, inner];
    const result = cloneDepth(arr, 0);
    expect(result).not.toBe(arr);
    expect(result[1]).toBe(inner);
  });

  test('clones nested arrays at depth 1', () => {
    const arr = [[1, 2], [3, 4]];
    const result = cloneDepth(arr, 1);
    expect(result[0]).not.toBe(arr[0]);
    expect(result).toEqual([[1, 2], [3, 4]]);
  });

  test('returns primitives as-is', () => {
    expect(cloneDepth(42, 1)).toBe(42);
    expect(cloneDepth('hello', 1)).toBe('hello');
  });
});
