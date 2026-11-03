import {
  pairsProvider,
  pairsVisitor,
} from '../src/pairsProvider';
import type {
  TPairsPreset,
} from '../src/pairsProvider';
import {
  pairsSchema,
} from '../src/pairsSchema';
import {
  lazy,
  object,
} from '../src/schema';

/** A name alone is its own value; a pattern alone has none. */
const ATTRS: TPairsPreset = {
  separator: /[\s,|;]+/,
  pair: ':',
  alone: (name) => (name[0] === '*' ? undefined : name),
};

describe('pairsProvider', () => {
  const read = pairsProvider(ATTRS);

  test.each([
    [
      'a separated string',
      'class, className:class',
    ],
    [
      'an array of entries',
      [
        'class',
        'className:class',
      ],
    ],
    [
      'spaces and repeated separators, spaces around the pair',
      ' class ,, className : class ',
    ],
  ])('%s', (_name, value) => {
    expect(read(value)).toEqual([
      [
        'class',
        'class',
      ],
      [
        'className',
        'class',
      ],
    ]);
  });

  test('an object, key by key, trimmed', () => {
    expect(read({
      className: 'class',
      ' iconM ': ' m ',
    })).toEqual([
      [
        'className',
        'class',
      ],
      [
        'iconM',
        'm',
      ],
    ]);
  });

  test('the order is kept and a name may repeat', () => {
    expect(read('a:x, b, a:y')).toEqual([
      [
        'a',
        'x',
      ],
      [
        'b',
        'b',
      ],
      [
        'a',
        'y',
      ],
    ]);
  });

  test('the value is cut at the first pair only', () => {
    expect(read('a:b:c')).toEqual([
      [
        'a',
        'b:c',
      ],
    ]);
  });

  test.each([
    [undefined],
    [null],
    [''],
    [[]],
    [{}],
  ])('empty: %p — no pairs', (value) => {
    expect(read(value)).toEqual([]);
  });

  test('what can\'t be read is skipped, never thrown', () => {
    expect(read([
      ':class',
      'a:',
      '*Class',
      5 as unknown as string,
      'ok:class',
    ])).toEqual([
      [
        'ok',
        'class',
      ],
    ]);
    expect(read({
      a: 1 as unknown as string,
      b: ' ',
      ' ': 'x',
      c: 'd',
    })).toEqual([
      [
        'c',
        'd',
      ],
    ]);
  });

  test('without alone a name alone is not allowed', () => {
    expect(pairsProvider({
      separator: ',',
      pair: '=',
    })('A=1,B,C=2')).toEqual([
      [
        'A',
        '1',
      ],
      [
        'C',
        '2',
      ],
    ]);
  });

  test('a pair of several characters, escaped in the joining of spaces', () => {
    expect(pairsProvider({
      separator: ';',
      pair: '=>',
    })('a => b; c=>d')).toEqual([
      [
        'a',
        'b',
      ],
      [
        'c',
        'd',
      ],
    ]);
  });

  test.each([
    [
      {
        separator: '',
        pair: ':',
      },
      '"separator" expects a separator: a non-empty string or a RegExp, got string ""',
    ],
    [
      {
        separator: ',',
        pair: '',
      },
      '"pair" expects a non-empty string, got an empty string',
    ],
    [
      {
        separator: ',',
        pair: ':',
        alone: 'self',
      },
      '"alone" expects',
    ],
    [
      {
        separator: ',',
        pair: ':',
        sep: ',',
      },
      'unknown option "sep"',
    ],
  ])('the preset is checked on creation: %p', (preset, message) => {
    expect(() => pairsProvider(preset as unknown as TPairsPreset)).toThrow(message);
  });

  test('the walk stops when visit says so', () => {
    const seen: string[] = [];
    pairsVisitor(ATTRS)('a, b, c', (_problem, entry) => {
      seen.push(entry);
      return entry === 'b';
    });
    expect(seen).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('pairsSchema', () => {
  const OPTIONS = lazy(() => object({
    attrs: pairsSchema({
      ...ATTRS,
      check: (_name, value) => (value.indexOf('*') < 0 ? '' : 'a pattern is not a target'),
    }).optional(),
    env: pairsSchema({
      separator: ',',
      pair: '=',
    }).optional(),
  }));
  const where = '[lab] createScanner';
  const parse = (value: unknown): unknown => OPTIONS().parse(value, where);

  test.each([
    [{}],
    [
      {
        attrs: 'class, className:class',
      },
    ],
    [
      {
        attrs: [
          'class',
          'className : class',
        ],
      },
    ],
    [
      {
        attrs: {
          className: 'class',
        },
      },
    ],
    [
      {
        attrs: '',
      },
    ],
    [
      {
        env: 'A=1,B=2',
      },
    ],
  ])('fits: %p', (value) => {
    expect(parse(value)).toBe(value);
  });

  test.each([
    [
      {
        attrs: 5,
      },
      '"attrs" expects a list — a string "a, b:c", an array ["a", "b:c"] or an object { b: "c" }, got number 5',
    ],
    [
      {
        attrs: [
          'class',
          5,
        ],
      },
      '"attrs" entry "5" expects a string',
    ],
    [
      {
        attrs: {
          className: 1,
        },
      },
      '"attrs" entry "className" expects a string as its value',
    ],
    [
      {
        attrs: '*Class',
      },
      '"attrs" entry "*Class" has no value: write "*Class:…"',
    ],
    [
      {
        attrs: ':class',
      },
      '"attrs" entry ":class" has no name',
    ],
    [
      {
        attrs: 'a:',
      },
      '"attrs" entry "a:" has no value after ":"',
    ],
    [
      {
        attrs: {
          a: ' ',
        },
      },
      '"attrs" entry "a" has no value',
    ],
    [
      {
        attrs: {
          ' ': 'x',
        },
      },
      '"attrs" entry " :x" has no name',
    ],
    [
      {
        attrs: ['class, className:class'],
      },
      '"attrs" entry "class, className:class" holds a separator: write each entry apart',
    ],
    [
      {
        attrs: 'a:*b',
      },
      '"attrs" entry "a:*b": a pattern is not a target',
    ],
    [
      {
        env: ['A=1,B=2'],
      },
      '"env" entry "A=1,B=2" holds a separator: write each entry apart',
    ],
    [
      {
        env: 'A',
      },
      '"env" entry "A" has no value: write "A=…"',
    ],
  ])('the first problem: %p', (value, message) => {
    expect(() => parse(value)).toThrow(where + ': ' + message);
  });

  test('the preset is checked on creation, check included', () => {
    expect(() => pairsSchema({
      ...ATTRS,
      check: 'no' as unknown as () => string,
    })).toThrow('[fundamentool] pairsSchema: "check" expects');
  });
});
