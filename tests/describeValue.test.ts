import {
  describeValue,
} from '../src';

class BuildOptions {
  attrs = 'class';
}

describe('describeValue', () => {
  test.each([
    [
      'a short string',
      'p10',
      'string "p10"',
    ],
    [
      'quotes escaped',
      'say "hi"',
      'string "say \\"hi\\""',
    ],
    [
      'a line break escaped',
      'a\nb',
      'string "a\\nb"',
    ],
    [
      'a number',
      3,
      'number 3',
    ],
    [
      'a boolean',
      true,
      'boolean true',
    ],
    [
      'a bigint',
      10n,
      'bigint 10',
    ],
    [
      'a symbol',
      Symbol('s'),
      'symbol Symbol(s)',
    ],
    [
      'null',
      null,
      'null',
    ],
    [
      'undefined',
      undefined,
      'undefined',
    ],
    [
      'a function',
      () => 1,
      'function',
    ],
    [
      'an array',
      [
        1,
        2,
      ],
      'array',
    ],
    [
      'a plain object',
      {
        a: 1,
      },
      'object',
    ],
    [
      'an object without a prototype',
      Object.create(null),
      'object',
    ],
    [
      'a regular expression',
      /ab+/g,
      'RegExp /ab+/g',
    ],
    [
      'a date',
      new Date(0),
      'Date',
    ],
    [
      'a map',
      new Map(),
      'Map',
    ],
    [
      'a class instance',
      new BuildOptions(),
      'BuildOptions',
    ],
    [
      'a prototype that is a plain object',
      Object.create({}),
      'object',
    ],
    [
      'a constructor with no name',
      new (class {})(),
      'object',
    ],
  ])('%s', (
    _, value, expected,
  ) => {
    expect(describeValue(value)).toBe(expected);
  });

  test('a long string: its first 60 characters and its length', () => {
    expect(describeValue('x'.repeat(200))).toBe(`string "${'x'.repeat(60)}…" (200 characters)`);
  });

  test('a long string is escaped and cut on the original characters', () => {
    expect(describeValue('"'.repeat(61))).toBe(`string "${'\\"'.repeat(60)}…" (61 characters)`);
  });
});
