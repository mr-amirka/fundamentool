import { joinSuffixToMap } from '../../src/join/joinSuffixToMap';

describe('joinSuffixToMap', () => {
  test('appends suffix to all keys in prefixes', () => {
    expect(joinSuffixToMap({ a: 1, b: 1 }, '-x')).toEqual({ 'a-x': 1, 'b-x': 1 });
  });

  test('writes into existing output map', () => {
    const output: Record<string, number> = { c: 1 };
    joinSuffixToMap({ a: 1 }, '-x', output);
    expect(output).toEqual({ c: 1, 'a-x': 1 });
  });

  test('returns empty map for empty prefixes', () => {
    expect(joinSuffixToMap({}, '-x')).toEqual({});
  });
});
