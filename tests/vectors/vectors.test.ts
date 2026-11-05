/**
 * fundamentool/vectors (fundamentool D-099): the dot product, the nearest vectors, a merge of rankings, a vector as
 * bytes, a long text in pieces.
 */
import {
  chunkText,
  dot,
  fromBytes,
  fuseRanks,
  nearest,
  toBytes,
  WHERE,
} from '../../src/vectors';

describe('dot', () => {
  it('sums the products: the cosine of two unit vectors', () => {
    expect(dot([
      0.6,
      0.8,
    ], [
      0.8,
      0.6,
    ])).toBeCloseTo(0.96);
    expect(dot(new Float32Array([
      1,
      0,
    ]), [
      0,
      1,
    ])).toBe(0);
    expect(dot([], [])).toBe(0);
  });

  it('refuses vectors of different lengths in development', () => {
    expect(() => dot([
      1,
      2,
    ], [1])).toThrow(`${WHERE} dot: vectors of one length expected, got 2 and 1`);
  });

  it('skips the check in production', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(dot([
        1,
        2,
      ], [3])).toBeNaN();
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

describe('nearest', () => {
  const vectors = [
    [
      0,
      1,
    ],
    [
      0.8,
      0.6,
    ],
    [
      1,
      0,
    ],
    [
      0.8,
      0.6,
    ],
  ];

  it('the k best, best first; equal scores keep the lower index first', () => {
    expect(nearest(
      [
        1,
        0,
      ], vectors, 3,
    )).toEqual([
      [
        2,
        1,
      ],
      [
        1,
        0.8,
      ],
      [
        3,
        0.8,
      ],
    ]);
  });

  it('fewer than k when the list is shorter; none for k = 0 or no vectors', () => {
    expect(nearest(
      [
        1,
        0,
      ], vectors, 10,
    )).toHaveLength(4);
    expect(nearest(
      [
        1,
        0,
      ], vectors, 0,
    )).toEqual([]);
    expect(nearest(
      [
        1,
        0,
      ], [], 3,
    )).toEqual([]);
  });

  it('where: asked before scoring, a vector it refuses takes no part', () => {
    const asked: number[] = [];
    expect(nearest(
      [
        1,
        0,
      ], vectors, 2, {
        where: (index) => {
          asked.push(index);
          return index !== 2;
        },
      },
    )).toEqual([
      [
        1,
        0.8,
      ],
      [
        3,
        0.8,
      ],
    ]);
    expect(asked).toEqual([
      0,
      1,
      2,
      3,
    ]);
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
  ])('k = %p is refused', (k) => {
    expect(() => nearest(
      [1], [[1]], k,
    )).toThrow(`${WHERE} nearest: k is a whole number ≥ 0, got ${String(k)}`);
  });
});

describe('fuseRanks', () => {
  it('merges by rank: in both lists beats first in one', () => {
    expect(fuseRanks([
      [
        'editDistance',
        'trim',
      ],
      [
        'spaces',
        'editDistance',
      ],
    ])).toEqual([
      'editDistance',
      'spaces',
      'trim',
    ]);
  });

  it('an id twice in one list counts once, at its first place; equal scores keep the order first seen', () => {
    expect(fuseRanks([
      [
        'a',
        'a',
        'b',
      ],
      ['c'],
    ])).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('k: a smaller one favours the top places', () => {
    const lists = [
      [
        'a',
        'b',
        'c',
      ],
      [
        'c',
        'b',
        'a',
      ],
      ['b'],
    ];
    expect(fuseRanks(lists, {
      k: 0,
    })).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(fuseRanks(lists)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('no lists, or empty ones: no ids', () => {
    expect(fuseRanks([])).toEqual([]);
    expect(fuseRanks([
      [],
      [],
    ])).toEqual([]);
  });

  it.each([
    -1,
    Number.NaN,
    '60',
  ])('k = %p is refused', (k) => {
    expect(() => fuseRanks([], {
      k: k as number,
    })).toThrow(`${WHERE} fuseRanks: k is a number ≥ 0, got ${String(k)}`);
  });
});

describe('toBytes and fromBytes', () => {
  it('4 bytes per number, little-endian; back to the same numbers', () => {
    const bytes = toBytes([
      1,
      -2,
    ]);
    expect([...bytes]).toEqual([
      0,
      0,
      128,
      63,
      0,
      0,
      0,
      192,
    ]);
    expect([...fromBytes(bytes)]).toEqual([
      1,
      -2,
    ]);
    expect(fromBytes(new Uint8Array(0))).toEqual(new Float32Array(0));
  });

  it('a view into a larger buffer (a Node Buffer from a database) is read at its own offset', () => {
    const buffer = Buffer.concat([
      Buffer.from([
        9,
        9,
        9,
      ]),
      Buffer.from(toBytes([
        0.5,
        3,
      ])),
    ]).subarray(3);
    expect([...fromBytes(buffer)]).toEqual([
      0.5,
      3,
    ]);
  });

  it('a length not a multiple of 4 is refused', () => {
    expect(() => fromBytes(new Uint8Array(6))).toThrow(`${WHERE} fromBytes: 4 bytes per number expected, got 6 bytes`);
  });
});

describe('chunkText', () => {
  it('a text that fits is one piece, as written; a text of no words is none', () => {
    expect(chunkText('One two three.')).toEqual(['One two three.']);
    expect(chunkText('')).toEqual([]);
    expect(chunkText('  \n ')).toEqual([]);
  });

  it('whole sentences while they fit', () => {
    expect(chunkText('One two. Three four five. Six.', {
      maxWords: 3,
      overlap: 1,
    })).toEqual([
      'One two.',
      'Three four five.',
      'Six.',
    ]);
    expect(chunkText('A b. C d. E f g.', {
      maxWords: 4,
      overlap: 0,
    })).toEqual([
      'A b. C d.',
      'E f g.',
    ]);
  });

  it('the next piece repeats the last sentence when it is within the overlap', () => {
    expect(chunkText('A b c. D. E f g.', {
      maxWords: 4,
      overlap: 1,
    })).toEqual([
      'A b c. D.',
      'D. E f g.',
    ]);
  });

  it('a repeated sentence that would overflow the next piece is not repeated', () => {
    expect(chunkText('A b. C d e f.', {
      maxWords: 4,
      overlap: 2,
    })).toEqual([
      'A b.',
      'C d e f.',
    ]);
  });

  it('a sentence longer than maxWords is cut into windows sharing the overlap', () => {
    expect(chunkText('Short one. a b c d e f g', {
      maxWords: 3,
      overlap: 1,
    })).toEqual([
      'Short one.',
      'a b c',
      'c d e',
      'e f g',
    ]);
  });

  it('the space after the last sentence makes no piece', () => {
    expect(chunkText('A b. C d.  ', {
      maxWords: 2,
      overlap: 0,
    })).toEqual([
      'A b.',
      'C d.',
    ]);
  });

  it('a blank line ends a sentence too; ! ? … do', () => {
    expect(chunkText('A b\n\nC d! E f? G h… I', {
      maxWords: 2,
      overlap: 0,
    })).toEqual([
      'A b',
      'C d!',
      'E f?',
      'G h…',
      'I',
    ]);
  });

  it('the defaults: 200 words, 20 shared', () => {
    const long = Array.from({
      length: 250,
    }, (_, i) => `w${i}`).join(' ');
    const pieces = chunkText(long);
    expect(pieces.map((piece) => piece.split(' ').length)).toEqual([
      200,
      70,
    ]);
    expect(pieces[1].startsWith('w180 ')).toBe(true);
  });

  it('options are checked: an unknown key, a value, the overlap below maxWords', () => {
    expect(() => chunkText('x', {
      maxWord: 3,
    } as never)).toThrow('maxWords');
    expect(() => chunkText('x', {
      maxWords: 0,
    })).toThrow(`${WHERE} chunkText`);
    expect(() => chunkText('x', {
      maxWords: 3,
      overlap: 3,
    })).toThrow(`${WHERE} chunkText: overlap is below maxWords, got overlap 3 and maxWords 3`);
  });
});
