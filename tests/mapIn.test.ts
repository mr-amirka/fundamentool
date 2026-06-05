import { mapIn } from '../src/mapIn';

describe('mapIn', () => {
  test('maps object properties', () => {
    expect(mapIn({ a: 1, b: 2 }, v => v * 10)).toEqual({ a: 10, b: 20 });
  });

  test('passes key and collection to iteratee', () => {
    const keys: string[] = [];
    mapIn({ x: 1, y: 2 }, (v, k) => { keys.push(k); return v; });
    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });

  test('writes into provided output object', () => {
    const output: Record<string, number> = { z: 99 };
    mapIn({ a: 1 }, v => v * 2, output);
    expect(output).toEqual({ z: 99, a: 2 });
  });

  test('returns empty object for empty input', () => {
    expect(mapIn({}, v => v)).toEqual({});
  });
});
