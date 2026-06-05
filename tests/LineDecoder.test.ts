import { LineDecoder } from '../src/LineDecoder';

describe('LineDecoder', () => {
  test('splits lines across multiple chunks', () => {
    const decoder = new LineDecoder();

    const r1 = decoder.write('a\nb');
    const r2 = decoder.write('\nc\n');
    const r3 = decoder.end();

    expect(r1).toEqual(['a']);
    expect(r2).toEqual(['b', 'c']);
    expect(r3).toEqual([]);
  });

  test('supports CRLF and final tail on end', () => {
    const decoder = new LineDecoder();
    const lines = decoder.end('a\r\nb\r\nc');

    expect(lines).toEqual(['a', 'b', 'c']);
  });

  test('can keep empty lines when skipEmptyLines=false', () => {
    const decoder = new LineDecoder({ skipEmptyLines: false });
    const lines = decoder.end('\n\nx\n');

    expect(lines).toEqual(['', '', 'x']);
  });
});
