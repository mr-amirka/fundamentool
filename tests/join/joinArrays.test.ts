import { joinArrays } from '../../src/join/joinArrays';

describe('joinArrays', () => {
  test('joins prefixes and suffixes with default empty separator', () => {
    expect(joinArrays(['a', 'b'], ['d', 'e'])).toEqual(['ad', 'ae', 'bd', 'be']);
  });

  test('joins prefixes and suffixes with custom separator', () => {
    expect(joinArrays(['a', 'b'], ['d', 'e'], '.')).toEqual(['a.d', 'a.e', 'b.d', 'b.e']);
  });

  test('returns empty array when suffixes is empty', () => {
    expect(joinArrays(['a', 'b'], [])).toEqual([]);
  });

  test('appends to existing output array', () => {
    const output: string[] = ['x'];
    joinArrays(['a'], ['b'], '.', output);
    expect(output).toEqual(['x', 'a.b']);
  });
});
