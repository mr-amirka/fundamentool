/**
 * fundamentool/tupleLog (fundamentool D-108): records written as tuples, read back by name, older versions' lines moved
 * to the newest — by name by default, by a version's `up`.
 */
import {
  tupleLog,
} from '../src/tupleLog';

const V1 = {
  types: {
    m: [
      'at',
      'text',
    ],
    t: [
      'at',
      'title',
    ],
  },
};

describe('tupleLog', () => {
  it('writes a version line and records as tuples, the fields in their places', () => {
    const log = tupleLog({
      name: 'chat',
      versions: [V1],
    });
    expect(log.version).toBe(1);
    expect(log.head()).toBe('["~",1]');
    expect(log.line({
      type: 'm',
      text: 'hi "there"',
      at: 't1',
    })).toBe('["m","t1","hi \\"there\\""]');
    expect(log.line({
      type: 't',
      at: 't2',
      title: null,
    })).toBe('["t","t2",null]');
  });

  it.each([
    [
      'a type the version doesn\'t name',
      {
        type: 'x',
      },
      'chat: no type "x" in version 1 (types: m, t)',
    ],
    [
      'a field left undefined',
      {
        type: 'm',
        at: 't',
      },
      'chat: "m" without its field "text" — pass null for none',
    ],
  ])('line refuses %s', (
    _name, given, message,
  ) => {
    expect(() => tupleLog({
      name: 'chat',
      versions: [V1],
    }).line(given)).toThrow(message);
  });

  it('reads what it wrote, each record with its line; blank lines skipped', () => {
    const log = tupleLog({
      name: 'chat',
      versions: [V1],
    });
    const text = [
      log.head(),
      log.line({
        type: 'm',
        at: 't1',
        text: 'a\nb',
      }),
      '',
      log.line({
        type: 't',
        at: 't2',
        title: 'x',
      }),
      '',
    ].join('\n');
    expect(log.read(text)).toEqual({
      records: [
        {
          type: 'm',
          at: 't1',
          text: 'a\nb',
          line: 2,
        },
        {
          type: 't',
          at: 't2',
          title: 'x',
          line: 4,
        },
      ],
      problems: [],
      dropped: 0,
    });
  });

  it('lines before any version line are version 1', () => {
    expect(tupleLog({
      name: 'chat',
      versions: [V1],
    }).read('["m","t","hi"]').records).toEqual([
      {
        type: 'm',
        at: 't',
        text: 'hi',
        line: 1,
      },
    ]);
  });

  it('a broken line, an unknown type, a wrong length, a bad version line — problems, the rest kept', () => {
    const read = tupleLog({
      name: 'chat',
      versions: [V1],
    }).read([
      '["m","t","ok"]',
      '{"type":"m"}',
      'not json',
      '["x","t"]',
      '["m","t"]',
      '["~",2]',
      '["~","1"]',
      '["m","t2","ok too"]',
    ].join('\n'));
    expect(read.records.map((record) => record.line)).toEqual([
      1,
      8,
    ]);
    expect(read.problems).toEqual([
      {
        line: 2,
        message: 'not a tuple: a JSON array whose first item is its type',
      },
      {
        line: 3,
        message: 'not a tuple: a JSON array whose first item is its type',
      },
      {
        line: 4,
        message: 'no type "x" in version 1',
      },
      {
        line: 5,
        message: '"m" has 2 fields in version 1, the line 1',
      },
      {
        line: 6,
        message: 'a version line of version 1 to 1 expected',
      },
      {
        line: 7,
        message: 'a version line of version 1 to 1 expected',
      },
    ]);
  });

  it('an older version\'s lines moved up: by name by default — a new field null, a dropped type left out', () => {
    const log = tupleLog({
      name: 'chat',
      versions: [
        V1,
        {
          types: {
            m: [
              'at',
              'lang',
              'text',
            ],
          },
        },
      ],
    });
    expect(log.version).toBe(2);
    expect(log.head()).toBe('["~",2]');
    const read = log.read([
      '["~",1]',
      '["m","t1","old"]',
      '["t","t2","a title"]',
      '["~",2]',
      '["m","t3","ru","new"]',
    ].join('\n'));
    expect(read.records).toEqual([
      {
        type: 'm',
        at: 't1',
        lang: null,
        text: 'old',
        line: 2,
      },
      {
        type: 'm',
        at: 't3',
        lang: 'ru',
        text: 'new',
        line: 5,
      },
    ]);
    expect(read.dropped).toBe(1);
  });

  it('a version\'s up moves each record of the one before; null leaves it out; the steps chain', () => {
    const log = tupleLog({
      name: 'chat',
      versions: [
        V1,
        {
          types: {
            m: [
              'at',
              'words',
            ],
          },
          up: (record) => (record.type === 'm' ? {
            type: 'm',
            at: record.at,
            words: String(record.text).split(' ').length,
          } : null),
        },
        {
          types: {
            m: [
              'at',
              'words',
              'long',
            ],
          },
        },
      ],
    });
    const read = log.read('["m","t1","one two three"]\n["t","t2","x"]\n["~",3]\n["m","t3",1,false]');
    expect(read.records).toEqual([
      {
        type: 'm',
        at: 't1',
        words: 3,
        long: null,
        line: 1,
      },
      {
        type: 'm',
        at: 't3',
        words: 1,
        long: false,
        line: 4,
      },
    ]);
    expect(read.dropped).toBe(1);
  });

  it('schema: every version\'s types, for the schema\'s file', () => {
    expect(tupleLog({
      name: 'chat',
      versions: [V1],
    }).schema()).toEqual({
      format: 'tuple-log',
      name: 'chat',
      version: 1,
      versions: [V1.types],
    });
  });

  it.each([
    [
      'no versions',
      {
        name: 'x',
        versions: [],
      },
      'a list of versions, one at least',
    ],
    [
      'an unknown option',
      {
        name: 'x',
        version: [V1],
      },
      'version',
    ],
    [
      'a type\'s fields not names',
      {
        name: 'x',
        versions: [
          {
            types: {
              m: [1],
            },
          },
        ],
      },
      'versions[0]',
    ],
    [
      'the type ~',
      {
        name: 'x',
        versions: [
          {
            types: {
              '~': ['n'],
            },
          },
        ],
      },
      'the type "~" is the version line\'s',
    ],
  ])('refuses %s', (
    _name, options, message,
  ) => {
    expect(() => tupleLog(options as never)).toThrow(message);
  });

  it('skips the options check in production', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(tupleLog({
        name: 'x',
        versions: [V1],
        extra: true,
      } as never).version).toBe(1);
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});
