import { LineBasedFormat } from '../src/LineBasedFormat';

describe('LineBasedFormat', () => {
  const fmt = new LineBasedFormat({
    parse: (line) => JSON.parse(line),
    stringify: (v) => JSON.stringify(v),
  });

  test('parse splits by newline and applies parse function', () => {
    const result = fmt.parse('{"a":1}\n{"b":2}');
    expect(result).toEqual([{ a: 1 }, { b: 2 }]);
  });

  test('parse handles CRLF line endings', () => {
    const result = fmt.parse('{"a":1}\r\n{"b":2}');
    expect(result).toEqual([{ a: 1 }, { b: 2 }]);
  });

  test('stringify joins values with newline', () => {
    const result = fmt.stringify([{ a: 1 }, { b: 2 }]);
    expect(result).toBe('{"a":1}\n{"b":2}');
  });

  test('parse single line', () => {
    expect(fmt.parse('{"x":42}')).toEqual([{ x: 42 }]);
  });

  test('stringify single item', () => {
    expect(fmt.stringify([{ x: 42 }])).toBe('{"x":42}');
  });
});
