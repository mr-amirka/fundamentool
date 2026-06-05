import { filterIn } from '../src/filterIn';

describe('filterIn', () => {
  test('filters object properties by predicate', () => {
    expect(filterIn({ a: 1, b: 0, c: 2 }, v => v > 0)).toEqual({ a: 1, c: 2 });
  });

  test('returns empty object when nothing passes', () => {
    expect(filterIn({ a: 1, b: 2 }, v => v > 100)).toEqual({});
  });

  test('writes into provided output object', () => {
    const output: Record<string, number> = { z: 99 };
    filterIn({ a: 1, b: 0 }, v => v > 0, output);
    expect(output).toEqual({ z: 99, a: 1 });
  });
});
