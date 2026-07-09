import {
  parse, stringify, parseEachLine, 
} from '../src/csv';

describe('csv.parseEachLine', () => {
  test('calls callback for each line with parsed columns', () => {
    const rows: any[][] = [];
    parseEachLine('1;2;3\n4;5;6', row => rows.push(row));
    expect(rows).toEqual([[
      1,
      2,
      3,
    ], [
      4,
      5,
      6,
    ]]);
  });

  test('decodes URI components', () => {
    const rows: any[][] = [];
    parseEachLine('hello%20world;42', row => rows.push(row));
    expect(rows[0][0]).toBe('hello world');
    expect(rows[0][1]).toBe(42);
  });

  test('parses JSON values where possible', () => {
    const rows: any[][] = [];
    parseEachLine('true;null;%22text%22', row => rows.push(row));
    expect(rows[0]).toEqual([
      true,
      null,
      'text',
    ]);
  });
});

describe('csv.parse', () => {
  test('parses CSV string into 2D array', () => {
    expect(parse('1;2;3\n4;5;6')).toEqual([[
      1,
      2,
      3,
    ], [
      4,
      5,
      6,
    ]]);
  });

  test('pushes into provided output array', () => {
    const output: any[][] = [[0]];
    parse('1;2', output);
    expect(output).toEqual([[0], [1, 2]]);
  });
});

describe('csv.stringify', () => {
  test('serializes 2D array to CSV string (rows joined with "\\n")', () => {
    const result = stringify([[1, 2], [3, 4]]);
    expect(result).toBe('1;2\n3;4');
  });

  test('encodes strings with special characters', () => {
    const result = stringify([['hello world']]);
    // "hello world" → JSON.stringify → '"hello world"' → encodeURIComponent → '%22hello%20world%22'
    expect(result).toContain('%22hello%20world%22');
  });

  test('round-trip: stringify → parse preserves all rows and columns', () => {
    const data = [[
      1,
      'hello',
      true,
    ], [
      null,
      2,
      false,
    ]];
    expect(parse(stringify(data))).toEqual(data);
  });
});
