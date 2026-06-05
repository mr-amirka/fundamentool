import { parse, stringify } from '../../src/jsonl/base';

describe('jsonl/base', () => {
  describe('parse', () => {
    test('parses single JSON line', () => {
      expect(parse('{"a":1}')).toEqual([{ a: 1 }]);
    });

    test('parses multiple JSON lines', () => {
      expect(parse('{"a":1}\n{"b":2}')).toEqual([{ a: 1 }, { b: 2 }]);
    });

    test('parses lines separated by \\r\\n', () => {
      expect(parse('1\r\n2')).toEqual([1, 2]);
    });

    test('parses primitive values', () => {
      expect(parse('1\n"hello"\ntrue')).toEqual([1, 'hello', true]);
    });
  });

  describe('stringify', () => {
    test('stringifies a single object to one line', () => {
      expect(stringify([{ a: 1 }])).toBe('{"a":1}');
    });

    test('stringifies multiple objects separated by newline', () => {
      expect(stringify([{ a: 1 }, { b: 2 }])).toBe('{"a":1}\n{"b":2}');
    });

    test('stringifies primitive array', () => {
      expect(stringify([1, 'x', true])).toBe('1\n"x"\ntrue');
    });
  });

  test('round-trips through stringify → parse', () => {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    expect(parse(stringify(data))).toEqual(data);
  });
});
