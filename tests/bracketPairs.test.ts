import {
  bracketPairs,
} from '../src/bracketPairs';
import type {
  TBracketProblem,
} from '../src/bracketPairs';
import {
  escapedSplitProvider,
} from '../src/escapedSplitProvider';
import {
  escapedHalfProvider,
} from '../src/escapedHalfProvider';

const PAREN: [string, string] = [
  '(',
  ')',
];
const SQUARE: [string, string] = [
  '[',
  ']',
];

/** A comma splitter over `pairs`, and the problems it reported. */
function splitter(pairs: [string, string][]): [(input: string) => string[], TBracketProblem[]] {
  const problems: TBracketProblem[] = [];
  const split = escapedSplitProvider({
    separator: ',',
    brackets: bracketPairs(pairs, {
      onUnbalanced: (problem) => problems.push(problem),
    }),
  }).base;
  return [
    split,
    problems,
  ];
}

describe('bracketPairs — pairs', () => {
  test.each([
    [
      'a(1,2),[b,c],d',
      [
        'a(1,2)',
        '[b,c]',
        'd',
      ],
    ],
    [
      'f(g[1,2],3),x',
      [
        'f(g[1,2],3)',
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
  ])('%j → %j', (input, parts) => {
    const [
      split,
      problems,
    ] = splitter([
      PAREN,
      SQUARE,
    ]);
    expect(split(input)).toEqual(parts);
    expect(problems).toEqual([]);
  });

  test('brackets of any length, the longest first', () => {
    const [split] = splitter([
      [
        '{',
        '}',
      ],
      [
        '{{',
        '}}',
      ],
    ]);
    expect(split('{{b,c}},{d,e},f')).toEqual([
      '{{b,c}}',
      '{d,e}',
      'f',
    ]);
  });

  test('a bracket with characters a regular expression treats as its own', () => {
    const [split] = splitter([
      [
        '${',
        '}',
      ],
    ]);
    expect(split('a${b,c},d')).toEqual([
      'a${b,c}',
      'd',
    ]);
  });
});

describe('bracketPairs — problems are reported, the bracket skipped', () => {
  test('a closing bracket with nothing open', () => {
    const [
      split,
      problems,
    ] = splitter([PAREN]);
    expect(split('a)b,c')).toEqual([
      'a)b',
      'c',
    ]);
    expect(problems).toEqual([
      {
        kind: 'stray',
        got: ')',
        index: 1,
        input: 'a)b,c',
      },
    ]);
  });

  test('a closing bracket of another pair: the open one stays open', () => {
    const [
      split,
      problems,
    ] = splitter([
      PAREN,
      SQUARE,
    ]);
    expect(split('a(1],b')).toEqual(['a(1],b']);
    expect(problems).toEqual([
      {
        kind: 'mismatch',
        expected: ')',
        got: ']',
        index: 3,
        input: 'a(1],b',
      },
      {
        kind: 'unclosed',
        open: '(',
        expected: ')',
        index: 1,
        input: 'a(1],b',
      },
    ]);
  });

  test('brackets never closed — each, in the order written', () => {
    const [
      split,
      problems,
    ] = splitter([
      PAREN,
      SQUARE,
    ]);
    expect(split('a(b[c,d')).toEqual(['a(b[c,d']);
    expect(problems.map((problem) => problem.kind === 'unclosed' && [
      problem.open,
      problem.index,
    ])).toEqual([
      [
        '(',
        1,
      ],
      [
        '[',
        3,
      ],
    ]);
  });

  test('without onUnbalanced — skipped silently', () => {
    const split = escapedSplitProvider({
      separator: ',',
      brackets: bracketPairs([PAREN]),
    }).base;
    expect(split('a)b,c(d')).toEqual([
      'a)b',
      'c(d',
    ]);
  });

  test('onUnbalanced may split again: each call has its own stack', () => {
    const inner: string[][] = [];
    const brackets = bracketPairs([PAREN], {
      onUnbalanced: () => inner.push(split('x(1,2),y')),
    });
    const split = escapedSplitProvider({
      separator: ',',
      brackets,
    }).base;
    expect(split('a(b,c')).toEqual(['a(b,c']);
    expect(inner).toEqual([
      [
        'x(1,2)',
        'y',
      ],
    ]);
  });
});

describe('bracketPairs — escapedHalfProvider', () => {
  test.each([
    [
      'a(b:c):d',
      [
        'a(b:c)',
        ':d',
        'd',
      ],
      [],
    ],
    [
      'a:b(',
      [
        'a',
        ':b(',
        'b(',
      ],
      [],
    ],
    [
      'a(b:c',
      [
        'a(b:c',
        '',
        '',
      ],
      ['unclosed'],
    ],
    [
      'a):b',
      [
        'a)',
        ':b',
        'b',
      ],
      ['stray'],
    ],
  ])('%j → %j, problems %j', (
    input, parts, kinds,
  ) => {
    const problems: TBracketProblem[] = [];
    const half = escapedHalfProvider({
      separator: ':',
      brackets: bracketPairs([PAREN], {
        onUnbalanced: (problem) => problems.push(problem),
      }),
    });
    expect(half.base(input)).toEqual(parts);
    expect(problems.map((problem) => problem.kind)).toEqual(kinds);
  });
});

describe('bracketPairs — the arguments are checked', () => {
  test.each([
    [
      [],
      undefined,
      'expects at least one pair',
    ],
    [
      [
        [
          '',
          ')',
        ],
      ],
      undefined,
      'expects a bracket, got an empty string',
    ],
    [
      [
        [
          '|',
          '|',
        ],
      ],
      undefined,
      'expects an opening and a closing bracket that differ, got "|" twice',
    ],
    [
      [
        PAREN,
        [
          '(',
          ']',
        ],
      ],
      undefined,
      'expects each bracket once, got "(" twice',
    ],
    [
      '()',
      undefined,
      '[fundamentool] bracketPairs pairs: expects a list',
    ],
    [
      [PAREN],
      {
        onUnbalance: () => undefined,
      },
      'unknown option "onUnbalance". Did you mean "onUnbalanced"?',
    ],
    [
      [PAREN],
      {
        onUnbalanced: true,
      },
      '"onUnbalanced" expects a function, got boolean true',
    ],
  ])('%j, %j', (
    pairs, options, message,
  ) => {
    expect(() => bracketPairs(pairs as never, options as never)).toThrow(message);
  });

  test('in production — not checked', () => {
    const mode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(bracketPairs([]).source).toBe('');
    } finally {
      process.env.NODE_ENV = mode;
    }
  });
});
