/**
 * fundamentool/vectors `chunkBlocks` (fundamentool D-110): a structured text's blocks packed into pieces — the cases of
 * lab-agent-kit's structural splitter card § 4.
 */
import {
  chunkBlocks,
  wordsOf,
  WHERE,
} from '../../src/vectors';

/** `count` words: `w0 w1 …`. */
const wordsText = (count: number, from = 0): string => Array.from({
  length: count,
}, (_, i) => `w${from + i}`).join(' ');

describe('chunkBlocks', () => {
  it('C1: blocks that fit are one piece, joined by a blank line; C2: blocks of no words are none', () => {
    expect(chunkBlocks([
      {
        text: '# A',
        keepWithNext: true,
      },
      {
        text: 'b c',
        context: 'A',
      },
    ])).toEqual(['# A\n\nb c']);
    expect(chunkBlocks([])).toEqual([]);
    expect(chunkBlocks([
      {
        text: '  \n ',
      },
    ])).toEqual([]);
  });

  it('whole blocks while they fit; the card\'s example', () => {
    expect(chunkBlocks([
      {
        text: '## Install',
        keepWithNext: true,
      },
      {
        text: 'Run the build first. It takes a minute.',
        context: 'Install',
      },
      {
        text: '```sh\npnpm run build\n```',
        context: 'Install',
      },
    ], {
      maxWords: 12,
      overlap: 3,
    })).toEqual([
      '## Install\n\nRun the build first. It takes a minute.',
      'Install\n\n```sh\npnpm run build\n```',
    ]);
  });

  it('C3: a piece opening inside a section starts with its heading — only one within the overlap', () => {
    expect(chunkBlocks([
      {
        text: '# T',
        keepWithNext: true,
      },
      {
        text: 'a b',
        context: 'T',
      },
      {
        text: 'c d e',
        context: 'T',
      },
    ], {
      maxWords: 4,
      overlap: 2,
    })).toEqual([
      '# T\n\na b',
      'T\n\nc d e',
    ]);
    expect(chunkBlocks([
      {
        text: 'a b',
        context: 'x y',
      },
      {
        text: 'c d',
        context: 'x y',
      },
    ], {
      maxWords: 3,
      overlap: 1,
    })).toEqual([
      'a b',
      'c d',
    ]);
  });

  it('C4: a heading whose next block doesn\'t fit goes to the next piece with it; one left at the end is a piece', () => {
    expect(chunkBlocks([
      {
        text: 'a b',
      },
      {
        text: '## H',
        keepWithNext: true,
      },
      {
        text: 'c d',
        context: 'H',
      },
    ], {
      maxWords: 4,
      overlap: 1,
    })).toEqual([
      'a b',
      '## H\n\nc d',
    ]);
    expect(chunkBlocks([
      {
        text: 'a b c',
      },
      {
        text: '## End',
        keepWithNext: true,
      },
    ], {
      maxWords: 4,
      overlap: 1,
    })).toEqual([
      'a b c',
      '## End',
    ]);
  });

  it('C4: blocks kept together that overflow any piece: the first go alone, the last kept with its block', () => {
    expect(chunkBlocks([
      {
        text: '# A long heading here',
        keepWithNext: true,
      },
      {
        text: 'Lead:',
        keepWithNext: true,
      },
      {
        text: 'a b c',
      },
    ], {
      maxWords: 5,
      overlap: 1,
    })).toEqual([
      '# A long heading here',
      'Lead:\n\na b c',
    ]);
    expect(chunkBlocks([
      {
        text: 'x',
      },
      {
        text: 'Lead in here:',
        keepWithNext: true,
      },
      {
        text: 'a b c',
      },
    ], {
      maxWords: 4,
      overlap: 1,
    })).toEqual([
      'x\n\nLead in here:',
      'a b c',
    ]);
  });

  it('C5: a block too long for a piece is cut into windows, each opened by its heading', () => {
    expect(chunkBlocks([
      {
        text: '# T',
        keepWithNext: true,
      },
      {
        text: 'a b c d e f',
        context: 'T',
      },
    ], {
      maxWords: 4,
      overlap: 2,
    })).toEqual([
      '# T\n\na b',
      'T\n\nb c',
      'T\n\nc d',
      'T\n\nd e',
      'T\n\ne f',
    ]);
    expect(chunkBlocks([
      {
        text: 'a b c d e',
      },
    ], {
      maxWords: 3,
      overlap: 1,
    })).toEqual([
      'a b',
      'b c',
      'c d',
      'd e',
    ]);
  });

  it('C6: a short block before the cut opens the next piece too — when what follows still fits', () => {
    expect(chunkBlocks([
      {
        text: 'a b c',
      },
      {
        text: 'd',
      },
      {
        text: 'e f g',
      },
    ], {
      maxWords: 5,
      overlap: 2,
    })).toEqual([
      'a b c\n\nd',
      'd\n\ne f g',
    ]);
    expect(chunkBlocks([
      {
        text: 'a b c',
      },
      {
        text: 'd',
      },
      {
        text: 'e f g h i',
      },
    ], {
      maxWords: 5,
      overlap: 2,
    })).toEqual([
      'a b c\n\nd',
      'e f g h i',
    ]);
  });

  it('the defaults: 200 words, 20 shared', () => {
    expect(chunkBlocks([
      {
        text: wordsText(150),
      },
      {
        text: wordsText(100, 150),
      },
    ]).map((piece) => piece.split(' ').length)).toEqual([
      150,
      100,
    ]);
  });

  it('wordsOf: the runs between spaces', () => {
    expect(wordsOf(' One  tool.\n')).toEqual([
      'One',
      'tool.',
    ]);
    expect(wordsOf(' \n')).toEqual([]);
  });

  it('C11: the blocks and the options are checked', () => {
    expect(() => chunkBlocks([
      {
        text: 1,
      },
    ] as never)).toThrow(`${WHERE} chunkBlocks`);
    expect(() => chunkBlocks([], {
      maxWord: 3,
    } as never)).toThrow('maxWords');
    expect(() => chunkBlocks([], {
      maxWords: 3,
      overlap: 3,
    })).toThrow(`${WHERE} chunkBlocks: overlap is below maxWords, got overlap 3 and maxWords 3`);
  });
});
