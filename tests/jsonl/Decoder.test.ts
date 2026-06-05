import { Decoder } from '../../src/jsonl/Decoder';
import { LineDecoder } from '../../src/LineDecoder';

describe('jsonl/Decoder', () => {
  test('decodes JSONL from multiple string chunks', () => {
    const decoder = new Decoder();

    const r1 = decoder.write('{"id":1}\n{"id":');
    const r2 = decoder.write('2}\n');
    const r3 = decoder.end();

    expect(r1).toEqual([{ id: 1 }]);
    expect(r2).toEqual([{ id: 2 }]);
    expect(r3).toEqual([]);
  });

  test('decodes JSONL when chunks split mid-key (string stream)', () => {
    const decoder = new Decoder();

    const r1 = decoder.write('{"name":"a"}\n{"na');
    const r2 = decoder.end('me":"b"}');

    expect(r1).toEqual([{ name: 'a' }]);
    expect(r2).toEqual([{ name: 'b' }]);
  });

  test('decodes JSONL from short UTF-8 string chunks', () => {
    const decoder = new Decoder();

    const r1 = decoder.write('{"n":1}\n');
    const r2 = decoder.end('{"n":2}');

    expect(r1).toEqual([{ n: 1 }]);
    expect(r2).toEqual([{ n: 2 }]);
  });

  test('supports CRLF line endings', () => {
    const decoder = new Decoder();
    const result = decoder.end('{"a":1}\r\n{"a":2}\r\n');

    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  test('throws line-aware parse error', () => {
    const decoder = new Decoder();
    decoder.write('{"ok":1}\n');

    expect(() => decoder.end('bad-json')).toThrow('Parse error on line 2');
  });
});

describe('LineDecoder with custom parser', () => {
  test('supports custom parser per line', () => {
    const NumDecoder = LineDecoder.provider((line) => Number(line));
    const decoder = new NumDecoder();

    const r1 = decoder.write('10\n20\n');
    const r2 = decoder.end('30');

    expect(r1).toEqual([10, 20]);
    expect(r2).toEqual([30]);
  });
});
