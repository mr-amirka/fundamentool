import fc from 'fast-check';
import {
  STANDARD_OPERATORS,
  matchProvider,
  type TMatch,
  type TMatchOperator,
} from '../../src/match';

const RECORD = {
  kind: 'decision',
  status: 'proposed',
  affects: [
    'packages/kit/',
    'LABARATORY/x.md',
  ],
  accepted: '2026-10-30 11:14 MSK',
  summary: {
    status: {
      proposed: 2,
    },
  },
};

describe('matchProvider — the grammar (fundamentool D-086)', () => {
  test.each<[string, TMatch, unknown, boolean]>([
    [
      'M1 equal fields, all of them',
      {
        kind: 'decision',
        status: 'proposed',
      },
      RECORD,
      true,
    ],
    [
      'M1 one field differs',
      {
        kind: 'decision',
        status: 'active',
      },
      RECORD,
      false,
    ],
    [
      'M2 a field is any of values',
      {
        status: [
          'active',
          'proposed',
        ],
      },
      RECORD,
      true,
    ],
    [
      'M2 none of them',
      {
        status: [
          'active',
          'cancelled',
        ],
      },
      RECORD,
      false,
    ],
    [
      'M3 or at the top: the second holds',
      [
        {
          status: 'active',
        },
        {
          kind: 'decision',
        },
      ],
      RECORD,
      true,
    ],
    [
      'M3 or at the top: none holds',
      [
        {
          status: 'active',
        },
        {
          kind: 'plan',
        },
      ],
      RECORD,
      false,
    ],
    [
      'M4 or inside an and',
      {
        kind: 'decision',
        $or: [
          {
            status: 'active',
          },
          {
            accepted: {
              $exists: true,
            },
          },
        ],
      },
      RECORD,
      true,
    ],
    [
      'M4 or inside an and, none',
      {
        kind: 'decision',
        $or: [
          {
            status: 'active',
          },
          {
            revised: {
              $exists: true,
            },
          },
        ],
      },
      RECORD,
      false,
    ],
    [
      'M5 not',
      {
        $not: {
          status: 'cancelled',
        },
      },
      RECORD,
      true,
    ],
    [
      'M5 not, holding',
      {
        $not: {
          status: 'proposed',
        },
      },
      RECORD,
      false,
    ],
    [
      'M5 $ne',
      {
        status: {
          $ne: 'cancelled',
        },
      },
      RECORD,
      true,
    ],
    [
      'M6 a range of strings',
      {
        accepted: {
          $gte: '2026-10-28',
          $lt: '2026-11-01',
        },
      },
      RECORD,
      true,
    ],
    [
      'M6 out of the range',
      {
        accepted: {
          $gte: '2026-10-31',
        },
      },
      RECORD,
      false,
    ],
    [
      'M7 words in a text, case aside',
      {
        accepted: {
          $has: 'msk',
        },
      },
      RECORD,
      true,
    ],
    [
      'M8 a nested field, partially',
      {
        summary: {
          status: {
            proposed: 2,
          },
        },
      },
      RECORD,
      true,
    ],
    [
      'M8 a nested field differs',
      {
        summary: {
          status: {
            proposed: 3,
          },
        },
      },
      RECORD,
      false,
    ],
    [
      'M9 an array field holds a value',
      {
        affects: 'LABARATORY/x.md',
      },
      RECORD,
      true,
    ],
    [
      'M9 an array field holds any of values',
      {
        affects: [
          'a',
          'packages/kit/',
        ],
      },
      RECORD,
      true,
    ],
    [
      'M9 holds none',
      {
        affects: [
          'a',
          'b',
        ],
      },
      RECORD,
      false,
    ],
    [
      'M10 absent',
      {
        revised: {
          $exists: false,
        },
      },
      RECORD,
      true,
    ],
    [
      'M10 present',
      {
        accepted: {
          $exists: false,
        },
      },
      RECORD,
      false,
    ],
    [
      'M15 a whole array, exactly',
      {
        affects: {
          $eq: [
            'packages/kit/',
            'LABARATORY/x.md',
          ],
        },
      },
      RECORD,
      true,
    ],
    [
      'M15 a prefix is not the array',
      {
        affects: {
          $eq: ['packages/kit/'],
        },
      },
      RECORD,
      false,
    ],
    [
      'M15 a $-named field, compared whole',
      {
        meta: {
          $eq: {
            $ref: 1,
          },
        },
      },
      {
        meta: {
          $ref: 1,
        },
      },
      true,
    ],
    [
      'a RegExp finds in a string',
      {
        accepted: /^2026-10/,
      },
      RECORD,
      true,
    ],
    [
      'a RegExp finds in an array of strings',
      {
        affects: /^LAB/,
      },
      RECORD,
      true,
    ],
    [
      'a RegExp on a number',
      {
        n: /1/,
      },
      {
        n: 1,
      },
      false,
    ],
  ])('%s', (
    _, pattern, value, expected,
  ) => {
    expect(matchProvider(pattern)(value)).toBe(expected);
  });
});

describe('matchProvider — paths and arrays', () => {
  test.each<[string, TMatch, unknown, boolean]>([
    [
      'a field under an array: any element\'s',
      {
        items: {
          id: 2,
        },
      },
      {
        items: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
      true,
    ],
    [
      'a field under an array: no element\'s',
      {
        items: {
          id: 3,
        },
      },
      {
        items: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
      false,
    ],
    [
      'an empty array on the way',
      {
        items: {
          id: 3,
        },
      },
      {
        items: [],
      },
      false,
    ],
    [
      'a numeric segment indexes the array',
      {
        items: {
          1: {
            id: 2,
          },
        },
      },
      {
        items: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
      true,
    ],
    [
      'a numeric segment, the other place',
      {
        items: {
          0: {
            id: 2,
          },
        },
      },
      {
        items: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      },
      false,
    ],
    [
      'the top is an array: any element',
      {
        id: 2,
      },
      [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ],
      true,
    ],
    [
      '$ne on an array field: none of its elements',
      {
        tags: {
          $ne: 'a',
        },
      },
      {
        tags: [
          'a',
          'b',
        ],
      },
      false,
    ],
    [
      '$ne on an array field without it',
      {
        tags: {
          $ne: 'c',
        },
      },
      {
        tags: [
          'a',
          'b',
        ],
      },
      true,
    ],
    [
      '$exists: false under an array: no element has it',
      {
        items: {
          id: {
            $exists: false,
          },
        },
      },
      {
        items: [
          {
            id: 1,
          },
          {},
        ],
      },
      false,
    ],
    [
      'a primitive on the way: absent',
      {
        a: {
          b: {
            $exists: false,
          },
        },
      },
      {
        a: 5,
      },
      true,
    ],
    [
      'null on the way: absent',
      {
        a: {
          b: 1,
        },
      },
      {
        a: null,
      },
      false,
    ],
    [
      'own properties only',
      {
        toString: {
          $exists: true,
        },
      },
      {},
      false,
    ],
    [
      'a class instance: its own keys',
      {
        x: 1,
      },
      new (class {
        x = 1;
      })(),
      true,
    ],
    [
      'a value that isn\'t an object',
      {
        a: 1,
      },
      'a',
      false,
    ],
    [
      'undefined in the pattern matches absent',
      {
        a: undefined,
      },
      {},
      true,
    ],
  ])('%s', (
    _, pattern, value, expected,
  ) => {
    expect(matchProvider(pattern)(value)).toBe(expected);
  });
});

describe('matchProvider — edges', () => {
  test.each<[string, TMatch, unknown, boolean]>([
    [
      '{} matches an object',
      {},
      {
        a: 1,
      },
      true,
    ],
    [
      '{} matches an array',
      {},
      [],
      true,
    ],
    [
      '{} doesn\'t match null',
      {},
      null,
      false,
    ],
    [
      '{} doesn\'t match a string',
      {},
      'x',
      false,
    ],
    [
      '[] matches nothing',
      [],
      {
        a: 1,
      },
      false,
    ],
    [
      '$or: [] matches nothing',
      {
        $or: [],
      },
      {
        a: 1,
      },
      false,
    ],
    [
      'null matches null',
      {
        a: null,
      },
      {
        a: null,
      },
      true,
    ],
    [
      'null doesn\'t match an object',
      {
        a: null,
      },
      {
        a: {
          b: 1,
        },
      },
      false,
    ],
    [
      'NaN matches NaN',
      {
        n: NaN,
      },
      {
        n: NaN,
      },
      true,
    ],
    [
      'Dates compare by time',
      {
        d: new Date(1),
      },
      {
        d: new Date(1),
      },
      true,
    ],
    [
      'different Dates',
      new Date(1),
      new Date(2),
      false,
    ],
    [
      'a Date range',
      {
        d: {
          $gte: new Date(1),
          $lt: new Date(3),
        },
      },
      {
        d: new Date(2),
      },
      true,
    ],
    [
      'a Date range, not a Date',
      {
        d: {
          $gte: new Date(1),
        },
      },
      {
        d: 2,
      },
      false,
    ],
    [
      'two RegExps by $eq',
      {
        r: {
          $eq: /a/i,
        },
      },
      {
        r: /a/i,
      },
      true,
    ],
    [
      '$gt across types never holds',
      {
        n: {
          $gt: 1,
        },
      },
      {
        n: '2',
      },
      false,
    ],
    [
      '$gt on numbers',
      {
        n: {
          $gt: 1,
        },
      },
      {
        n: 2,
      },
      true,
    ],
    [
      '$lte equal',
      {
        n: {
          $lte: 2,
        },
      },
      {
        n: 2,
      },
      true,
    ],
    [
      '$lt on an array: any element',
      {
        n: {
          $lt: 2,
        },
      },
      {
        n: [
          5,
          1,
        ],
      },
      true,
    ],
    [
      '$lt on an array: no element',
      {
        n: {
          $lt: 0,
        },
      },
      {
        n: [
          5,
          1,
        ],
      },
      false,
    ],
    [
      '$in on an array field',
      {
        tags: {
          $in: [
            'x',
            'b',
          ],
        },
      },
      {
        tags: [
          'a',
          'b',
        ],
      },
      true,
    ],
    [
      '$in, none',
      {
        tags: {
          $in: ['x'],
          $ne: 'a',
        },
      },
      {
        tags: [
          'a',
          'b',
        ],
      },
      false,
    ],
    [
      '$has on an array of strings',
      {
        tags: {
          $has: 'LP',
        },
      },
      {
        tags: [
          'help',
          'b',
        ],
      },
      true,
    ],
    [
      '$has a value an array holds',
      {
        tags: {
          $has: 2,
        },
      },
      {
        tags: [
          1,
          2,
        ],
      },
      true,
    ],
    [
      '$has a value an array doesn\'t hold',
      {
        tags: {
          $has: 3,
        },
      },
      {
        tags: [
          1,
          2,
        ],
      },
      false,
    ],
    [
      '$has a word, not a string',
      {
        n: {
          $has: 'x',
        },
      },
      {
        n: 5,
      },
      false,
    ],
    [
      '$has a value, a string',
      {
        s: {
          $has: 5,
        },
      },
      {
        s: '5',
      },
      false,
    ],
    [
      '$has, Cyrillic case',
      {
        s: {
          $has: 'МИНУТ',
        },
      },
      {
        s: 'пять минут',
      },
      true,
    ],
    [
      '$regex as [source, flags]',
      {
        s: {
          $regex: [
            '^a',
            'i',
          ],
        },
      },
      {
        s: 'Abc',
      },
      true,
    ],
    [
      '$regex as [source]',
      {
        s: {
          $regex: ['^a'],
        },
      },
      {
        s: 'Abc',
      },
      false,
    ],
    [
      '$regex g dropped: the same answer twice',
      {
        s: /a/g,
      },
      {
        s: 'a',
      },
      true,
    ],
    [
      '$type',
      {
        a: {
          $type: [
            'string',
            'null',
          ],
        },
      },
      {
        a: null,
      },
      true,
    ],
    [
      '$type, one',
      {
        a: {
          $type: 'number',
        },
      },
      {
        a: 'x',
      },
      false,
    ],
    [
      '$exists: true on undefined',
      {
        a: {
          $exists: true,
        },
      },
      {
        a: undefined,
      },
      false,
    ],
    [
      'a list of patterns, not values',
      [
        {
          a: 1,
        },
        2,
      ],
      2,
      true,
    ],
    [
      'a Map is compared whole',
      {
        m: new Map(),
      },
      {
        m: new Map(),
      },
      true,
    ],
  ])('%s', (
    _, pattern, value, expected,
  ) => {
    expect(matchProvider(pattern)(value)).toBe(expected);
  });

  test('$regex with g answers the same for the same string (M13 — called many times)', () => {
    const isA = matchProvider({
      s: /a/g,
    });
    expect([
      isA({
        s: 'a',
      }),
      isA({
        s: 'a',
      }),
      isA({
        s: 'a',
      }),
    ]).toEqual([
      true,
      true,
      true,
    ]);
  });
});

describe('matchProvider — a numeric segment under an array', () => {
  test('it indexes the array, or reads an element\'s own key (fast-check\'s counterexample)', () => {
    const value = {
      '': [
        {
          0: false,
        },
      ],
    };
    expect(matchProvider(value)(value)).toBe(true);
    expect(matchProvider({
      items: {
        0: {
          id: 1,
        },
      },
    })({
      items: [
        {
          id: 1,
        },
        {
          id: 2,
        },
      ],
    })).toBe(true);
    expect(matchProvider({
      items: {
        0: 'x',
      },
    })({
      items: [
        {
          0: 'y',
        },
        {
          0: 'x',
        },
      ],
    })).toBe(true);
    expect(matchProvider({
      items: {
        1: 'x',
      },
    })({
      items: ['y'],
    })).toBe(false);
  });
});

describe('matchProvider — an array field holds an object', () => {
  test('a Date or an object among the elements, compared deeply', () => {
    expect(matchProvider({
      dates: new Date(1),
    })({
      dates: [
        new Date(2),
        new Date(1),
      ],
    })).toBe(true);
    expect(matchProvider({
      items: {
        $eq: {
          id: 1,
        },
      },
    })({
      items: [
        {
          id: 2,
        },
        {
          id: 1,
        },
      ],
    })).toBe(true);
    expect(matchProvider({
      items: {
        $eq: {
          id: 3,
        },
      },
    })({
      items: [
        {
          id: 2,
        },
      ],
    })).toBe(false);
  });
});

describe('matchProvider — an operator a project adds (M11)', () => {
  const WITHIN: TMatchOperator<number, number> = {
    check: (argument) => (typeof argument === 'number' ? undefined : 'a number of milliseconds'),
    prepare: (argument) => 1000 - argument,
    test: (value, since) => typeof value === 'number' && value >= since,
  };
  const operators = {
    ...STANDARD_OPERATORS,
    $within: WITHIN,
  };

  test('it is used, prepared once', () => {
    const prepare = jest.fn(WITHIN.prepare);
    const isRecent = matchProvider({
      at: {
        $within: 100,
      },
    }, {
      operators: {
        ...operators,
        $within: {
          ...WITHIN,
          prepare,
        },
      },
    });
    expect([
      isRecent({
        at: 950,
      }),
      isRecent({
        at: 800,
      }),
    ]).toEqual([
      true,
      false,
    ]);
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  test('its check refuses at compiling', () => {
    expect(() => matchProvider({
      at: {
        $within: 'x',
      },
    }, {
      operators,
    })).toThrow('[fundamentool/match] matchProvider: "$within" at at expects a number of milliseconds, got string "x"');
  });

  test('a test that throws names the operator and the path', () => {
    const $boom: TMatchOperator = {
      test: () => {
        throw new Error('no');
      },
    };
    const isBoom = matchProvider({
      a: {
        $boom: 1,
      },
    }, {
      operators: {
        $boom,
      },
    });
    expect(() => isBoom({
      a: 1,
    })).toThrow('[fundamentool/match] "$boom" at a threw: no');
    const $throwsText: TMatchOperator = {
      test: () => {
        throw 'text';
      },
    };
    expect(() => matchProvider({
      $throwsText: 1,
    }, {
      operators: {
        $throwsText,
      },
    })(1)).toThrow('[fundamentool/match] "$throwsText" at the top threw: text');
  });

  test('a shorthand needs its operator in the registry', () => {
    expect(() => matchProvider({
      a: 1,
    }, {
      operators: {
        $within: WITHIN,
      },
    })).toThrow('the pattern at a is compared by "$eq", which isn\'t among the operators: $within');
  });

  test('an operator that is only a negation, for an argument it doesn\'t negate', () => {
    const $odd: TMatchOperator = {
      negationOf: (argument) => (argument ? [
        '$eq',
        1,
      ] : undefined),
    };
    expect(matchProvider({
      a: {
        $odd: true,
      },
    }, {
      operators: {
        ...STANDARD_OPERATORS,
        $odd,
      },
    })({
      a: 2,
    })).toBe(true);
    expect(() => matchProvider({
      a: {
        $odd: false,
      },
    }, {
      operators: {
        ...STANDARD_OPERATORS,
        $odd,
      },
    })).toThrow('"$odd" at a has no test, and isn\'t another operator\'s negation for boolean false');
  });
});

describe('matchProvider — options (api-input-validation.md)', () => {
  test.each<[string, unknown, string]>([
    [
      'an unknown option',
      {
        operator: {},
      },
      '[fundamentool/match] matchProvider: unknown option "operator". Did you mean "operators"?',
    ],
    [
      'not an object',
      5,
      '[fundamentool/match] matchProvider: expects an options object, got number 5',
    ],
    [
      'an operator without test',
      {
        operators: {
          $x: {},
        },
      },
      'an operator with test, or with negationOf',
    ],
    [
      'an operator\'s test not a function',
      {
        operators: {
          $x: {
            test: 1,
          },
        },
      },
      'expects a function, got number 1',
    ],
    [
      'a name without $',
      {
        operators: {
          x: {
            test: () => true,
          },
        },
      },
      'an operator\'s name starts with $ and isn\'t $or or $not: "x"',
    ],
    [
      'a logical name',
      {
        operators: {
          $or: {
            test: () => true,
          },
        },
      },
      '"$or"',
    ],
  ])('%s', (
    _, options, message,
  ) => {
    expect(() => matchProvider({}, options as never)).toThrow(message);
  });

  test('no operators given: the standard ones', () => {
    expect(matchProvider({
      a: 1,
    }, {})({
      a: 1,
    })).toBe(true);
  });
});

describe('matchProvider — properties', () => {
  /** JSON values a pattern reads as themselves: no empty lists, no lists in lists, no `$` keys. */
  const {
    value: SELF,
  } = fc.letrec((tie) => ({
    value: fc.oneof(
      {
        depthSize: 'small',
      },
      fc.oneof(
        fc.string(), fc.integer(), fc.boolean(), fc.constant(null),
      ),
      fc.array(fc.oneof(
        fc.string(), fc.integer(), tie('object'),
      ), {
        minLength: 1,
        maxLength: 4,
      }),
      tie('object'),
    ),
    object: fc.dictionary(
      fc.string().filter((key) => key[0] !== '$'), tie('value'), {
        maxKeys: 4,
      },
    ),
  }));

  test('a value matches itself as a pattern', () => {
    fc.assert(fc.property(SELF, (value) => matchProvider(value as TMatch)(value)));
  });

  test('$not is the opposite', () => {
    fc.assert(fc.property(
      SELF, fc.jsonValue(), (pattern, value) => (
        matchProvider(pattern as TMatch)(value) === !matchProvider({
          $not: pattern,
        })(value)
      ),
    ));
  });
});
