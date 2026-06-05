import { joinPrefixToMap } from '../../src/join/joinPrefixToMap';

describe('joinPrefixToMap', () => {
  test('prepends prefix to all keys in suffixes', () => {
    expect(joinPrefixToMap('a.', { b: 1, c: 1 })).toEqual({ 'a.b': 1, 'a.c': 1 });
  });

  test('writes into existing output map', () => {
    const output = { z: 1 };
    joinPrefixToMap('x-', { y: 1 }, output);
    expect(output).toEqual({ z: 1, 'x-y': 1 });
  });

  test('returns empty map for empty suffixes', () => {
    expect(joinPrefixToMap('pre-', {})).toEqual({});
  });
});
