import { toPlainFields } from '../src/toPlainFields';

describe('toPlainFields', () => {
  test('flattens nested object with dot notation', () => {
    expect(toPlainFields({ a: { b: 1 } })).toEqual({ 'a.b': 1 });
  });

  test('flattens array values with index keys', () => {
    expect(toPlainFields({ list: ['x', 'y'] })).toEqual({ 'list.0': 'x', 'list.1': 'y' });
  });

  test('handles mixed nested structure', () => {
    expect(toPlainFields({ a: { b: 1 }, list: ['x', 'y'] })).toEqual({
      'a.b': 1,
      'list.0': 'x',
      'list.1': 'y',
    });
  });

  test('handles deeply nested object', () => {
    expect(toPlainFields({ a: { b: { c: 42 } } })).toEqual({ 'a.b.c': 42 });
  });

  test('keeps primitive values at root', () => {
    expect(toPlainFields({ x: 1, y: 'hello' })).toEqual({ x: 1, y: 'hello' });
  });

  test('handles null as primitive leaf', () => {
    expect(toPlainFields({ a: null })).toEqual({ a: null });
  });

  test('returns empty object for empty input', () => {
    expect(toPlainFields({})).toEqual({});
  });
});
