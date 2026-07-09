import {
  joinProvider, 
} from '../../src/join/joinProvider';

describe('joinProvider', () => {
  test('creates a join function with the given delimiter', () => {
    const joinDot = joinProvider('.');
    expect(joinDot([
      'a',
      'b',
      'c',
    ])).toBe('a.b.c');
  });

  test('creates a join function with empty delimiter', () => {
    const joinOnly = joinProvider('');
    expect(joinOnly([
      'a',
      'b',
      'c',
    ])).toBe('abc');
  });

  test('handles single-element arrays', () => {
    const fn = joinProvider('-');
    expect(fn(['x'])).toBe('x');
  });

  test('handles empty arrays', () => {
    const fn = joinProvider(',');
    expect(fn([])).toBe('');
  });
});
