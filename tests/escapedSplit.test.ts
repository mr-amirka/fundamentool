import {
  escapedSplitProvider,
} from '../src/escapedSplitProvider';
import {
  escapedHalfProvider,
} from '../src/escapedHalfProvider';

describe('escapedSplitProvider', () => {
  const split = escapedSplitProvider({
    separator: ',',
  });

  test('splits on separator', () => {
    expect(split('a,b,c')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('preserves escaped separator', () => {
    expect(split('a\\,b,c')).toEqual([
      'a,b',
      'c',
    ]);
  });

  test('handles no separator', () => {
    expect(split('abc')).toEqual(['abc']);
  });

  test('handles empty string', () => {
    expect(split('')).toEqual(['']);
  });

  test('base() does not unescape', () => {
    expect(split.base('a\\,b,c')).toEqual([
      'a\\,b',
      'c',
    ]);
  });

  test('collects separators into dstSeparators', () => {
    const seps: string[] = [];
    split.base('a,b,c', seps);
    expect(seps).toEqual([
      ',',
      ',',
    ]);
  });
});

describe('escapedHalfProvider', () => {
  const half = escapedHalfProvider({
    separator: ':',
  });

  test('splits at first separator', () => {
    const [
      prefix,
      suffix,
      value,
    ] = half('key:value');
    expect(prefix).toBe('key');
    expect(suffix).toBe(':value');
    expect(value).toBe('value');
  });

  test('preserves escaped separator in prefix', () => {
    const [prefix] = half('key\\:name:value');
    expect(prefix).toBe('key:name');
  });

  test('returns full string in prefix when no separator', () => {
    const [
      prefix,
      suffix,
      value,
    ] = half('noSeparator');
    expect(prefix).toBe('noSeparator');
    expect(suffix).toBe('');
    expect(value).toBe('');
  });

  test('base() does not unescape', () => {
    const [prefix] = half.base('key\\:name:value');
    expect(prefix).toBe('key\\:name');
  });
});

describe('escaped providers — a sequence of your own that never splits', () => {
  it('`escaped` is a literal sequence kept whole (here the doubled separator)', () => {
    expect(escapedHalfProvider({
      separator: ':',
      escape: '::',
    })('a::b:c')).toEqual([
      'a::b',
      ':c',
      'c',
    ]);
    expect(escapedSplitProvider({
      separator: ',',
      escape: ',,',
    })('a,,b,c')).toEqual([
      'a,,b',
      'c',
    ]);
  });
});

describe('escaped providers — brackets', () => {
  const splitArgs = escapedSplitProvider({
    separator: ',',
    brackets: '(){}',
  });

  test.each([
    [
      'a(1,2),$b{3,4}',
      [
        'a(1,2)',
        '$b{3,4}',
      ],
    ],
    [
      'f(g(1,2),3),x',
      [
        'f(g(1,2),3)',
        'x',
      ],
    ],
    [
      'a\\(,b',
      [
        'a\\(',
        'b',
      ],
    ],
    [
      'a),b,c',
      ['a),b,c'],
    ],
    [
      '',
      [''],
    ],
  ])('split %j → %j', (input, parts) => {
    expect(splitArgs.base(input)).toEqual(parts);
  });

  test('a separator met is collected; inside brackets — not', () => {
    const separators: string[] = [];
    escapedSplitProvider({
      separator: /[<>]/,
      brackets: '[]',
    }).base('a<b[>c]>d', separators);
    expect(separators).toEqual([
      '<',
      '>',
    ]);
  });

  test.each([
    [
      'a[b:c]:d',
      [
        'a[b:c]',
        ':d',
        'd',
      ],
    ],
    [
      'a[b:c]',
      [
        'a[b:c]',
        '',
        '',
      ],
    ],
    [
      'a\\:b:c',
      [
        'a\\:b',
        ':c',
        'c',
      ],
    ],
  ])('half %j → %j', (input, parts) => {
    expect(escapedHalfProvider({
      separator: ':',
      brackets: '[]',
    }).base(input)).toEqual(parts);
  });
});

describe('escaped providers — a RegExp', () => {
  test('a separator and an escape as RegExp: their sources', () => {
    expect(escapedSplitProvider({
      separator: /[.#]/,
      escape: /\\.|\.\d/,
    }).base('a.b#c.5d')).toEqual([
      'a',
      'b',
      'c.5d',
    ]);
  });

  test('an empty match moves on — no endless loop', () => {
    expect(escapedSplitProvider({
      separator: /x*/,
    }).base('axb')).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('escaped providers — the options are checked', () => {
  test.each([
    [
      {
        separatr: ',',
      },
      'unknown option "separatr". Did you mean "separator"?',
    ],
    [
      {
        separator: 1,
      },
      '"separator" expects a string or a RegExp, got number 1',
    ],
    [
      {
        separator: ',',
        brackets: '(',
      },
      '"brackets" expects pairs of an opening and a closing character',
    ],
  ])('%j', (options, message) => {
    expect(() => escapedSplitProvider(options as never)).toThrow(message);
    expect(() => escapedHalfProvider(options as never)).toThrow(message);
  });
});

describe('escapedHalfProvider — an empty match', () => {
  test('moves on — no endless loop', () => {
    expect(escapedHalfProvider({
      separator: /x*/,
    }).base('axb')).toEqual([
      'a',
      'xb',
      'b',
    ]);
  });
});
