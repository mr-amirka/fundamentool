import {
  STANDARD_OPERATORS,
  normalizeMatch,
  type TMatch,
} from '../../src/match';

describe('normalizeMatch — every shorthand gone (M12)', () => {
  test('the card\'s example', () => {
    expect(normalizeMatch({
      kind: 'decision',
      status: [
        'proposed',
        'provisional',
      ],
      $not: {
        revised: {
          $exists: true,
        },
      },
    })).toEqual({
      kind: 'and',
      of: [
        {
          kind: 'op',
          path: ['kind'],
          op: '$eq',
          argument: 'decision',
        },
        {
          kind: 'op',
          path: ['status'],
          op: '$in',
          argument: [
            'proposed',
            'provisional',
          ],
        },
        {
          kind: 'not',
          of: {
            kind: 'op',
            path: ['revised'],
            op: '$exists',
            argument: true,
          },
        },
      ],
    });
  });

  test.each<[string, TMatch, unknown]>([
    [
      'a value: $eq at the top',
      5,
      {
        kind: 'op',
        path: [],
        op: '$eq',
        argument: 5,
      },
    ],
    [
      'a RegExp: $regex',
      {
        a: /x/,
      },
      {
        kind: 'op',
        path: ['a'],
        op: '$regex',
        argument: /x/,
      },
    ],
    [
      '{}: $type object or array',
      {
        a: {},
      },
      {
        kind: 'op',
        path: ['a'],
        op: '$type',
        argument: [
          'object',
          'array',
        ],
      },
    ],
    [
      'a nested object: a longer path',
      {
        a: {
          b: 1,
        },
      },
      {
        kind: 'op',
        path: [
          'a',
          'b',
        ],
        op: '$eq',
        argument: 1,
      },
    ],
    [
      '$ne: not $eq',
      {
        a: {
          $ne: 1,
        },
      },
      {
        kind: 'not',
        of: {
          kind: 'op',
          path: ['a'],
          op: '$eq',
          argument: 1,
        },
      },
    ],
    [
      '$exists: false — not $exists: true',
      {
        a: {
          $exists: false,
        },
      },
      {
        kind: 'not',
        of: {
          kind: 'op',
          path: ['a'],
          op: '$exists',
          argument: true,
        },
      },
    ],
    [
      'a list of one: its node',
      [
        {
          a: 1,
        },
      ],
      {
        kind: 'op',
        path: ['a'],
        op: '$eq',
        argument: 1,
      },
    ],
    [
      '[]: or of nothing',
      [],
      {
        kind: 'or',
        of: [],
      },
    ],
    [
      'a list of patterns: or',
      [
        {
          a: 1,
        },
        {
          b: 2,
        },
      ],
      {
        kind: 'or',
        of: [
          {
            kind: 'op',
            path: ['a'],
            op: '$eq',
            argument: 1,
          },
          {
            kind: 'op',
            path: ['b'],
            op: '$eq',
            argument: 2,
          },
        ],
      },
    ],
    [
      '$or beside a field',
      {
        a: 1,
        $or: [
          {
            b: 1,
          },
          {
            c: 1,
          },
        ],
      },
      {
        kind: 'and',
        of: [
          {
            kind: 'op',
            path: ['a'],
            op: '$eq',
            argument: 1,
          },
          {
            kind: 'or',
            of: [
              {
                kind: 'op',
                path: ['b'],
                op: '$eq',
                argument: 1,
              },
              {
                kind: 'op',
                path: ['c'],
                op: '$eq',
                argument: 1,
              },
            ],
          },
        ],
      },
    ],
    [
      'two operators on one field: and',
      {
        a: {
          $gte: 1,
          $lt: 5,
        },
      },
      {
        kind: 'and',
        of: [
          {
            kind: 'op',
            path: ['a'],
            op: '$gte',
            argument: 1,
          },
          {
            kind: 'op',
            path: ['a'],
            op: '$lt',
            argument: 5,
          },
        ],
      },
    ],
    [
      '$not beside operators',
      {
        a: {
          $gt: 1,
          $not: {
            $gt: 5,
          },
        },
      },
      {
        kind: 'and',
        of: [
          {
            kind: 'op',
            path: ['a'],
            op: '$gt',
            argument: 1,
          },
          {
            kind: 'not',
            of: {
              kind: 'op',
              path: ['a'],
              op: '$gt',
              argument: 5,
            },
          },
        ],
      },
    ],
    [
      'a Date: $eq',
      {
        d: new Date(1),
      },
      {
        kind: 'op',
        path: ['d'],
        op: '$eq',
        argument: new Date(1),
      },
    ],
  ])('%s', (
    _, pattern, tree,
  ) => {
    expect(normalizeMatch(pattern)).toEqual(tree);
  });

  test('the same object twice, not inside itself, is no cycle', () => {
    const shared = {
      b: 1,
    };
    expect(normalizeMatch([
      {
        a: shared,
      },
      {
        c: shared,
      },
    ])).toEqual({
      kind: 'or',
      of: [
        {
          kind: 'op',
          path: [
            'a',
            'b',
          ],
          op: '$eq',
          argument: 1,
        },
        {
          kind: 'op',
          path: [
            'c',
            'b',
          ],
          op: '$eq',
          argument: 1,
        },
      ],
    });
  });

  test('its options are checked as matchProvider\'s', () => {
    expect(normalizeMatch({
      a: 1,
    }, {
      operators: STANDARD_OPERATORS,
    })).toEqual({
      kind: 'op',
      path: ['a'],
      op: '$eq',
      argument: 1,
    });
    expect(() => normalizeMatch({}, {
      operator: {},
    } as never)).toThrow('[fundamentool/match] normalizeMatch: unknown option "operator". Did you mean "operators"?');
  });
});

describe('normalizeMatch — a bad pattern throws at once', () => {
  const cyclic: Record<string, unknown> = {
    a: 1,
  };
  cyclic.self = cyclic;
  const cyclicList: unknown[] = [
    {
      a: 1,
    },
  ];
  cyclicList.push(cyclicList);

  test.each<[string, unknown, string]>([
    [
      'an unknown operator, a near one',
      {
        status: {
          $inn: ['a'],
        },
      },
      'unknown operator "$inn" at status. Did you mean "$in"? Operators: $eq, $ne, $in, $gt, $gte, $lt, $lte, $has, $regex, $exists, $type',
    ],
    [
      'an unknown operator, none near',
      {
        $zzzzzz: 1,
      },
      'unknown operator "$zzzzzz" at the top. Operators: $eq',
    ],
    [
      'a wrong argument',
      {
        n: {
          $gt: {},
        },
      },
      '"$gt" at n expects a number, a string or a Date, got object',
    ],
    [
      'NaN is no bound',
      {
        n: {
          $gt: NaN,
        },
      },
      '"$gt" at n expects a number, a string or a Date, got number NaN',
    ],
    [
      'an invalid Date is no bound',
      {
        n: {
          $lt: new Date(NaN),
        },
      },
      '"$lt" at n expects a number, a string or a Date',
    ],
    [
      '$in not a list',
      {
        a: {
          $in: 1,
        },
      },
      '"$in" at a expects a list of values, got number 1',
    ],
    [
      '$has of undefined',
      {
        a: {
          $has: undefined,
        },
      },
      '"$has" at a expects a string, or a value an array holds, got undefined',
    ],
    [
      '$regex not a RegExp',
      {
        a: {
          $regex: 1,
        },
      },
      '"$regex" at a expects a RegExp, or [source, flags] of a valid one, got number 1',
    ],
    [
      '$regex flags not a string',
      {
        a: {
          $regex: [
            'a',
            1,
          ],
        },
      },
      '"$regex" at a expects a RegExp',
    ],
    [
      '$regex an invalid source',
      {
        a: {
          $regex: ['('],
        },
      },
      '"$regex" at a expects a RegExp',
    ],
    [
      '$exists not a boolean',
      {
        a: {
          $exists: 1,
        },
      },
      '"$exists" at a expects true or false, got number 1',
    ],
    [
      '$type unknown',
      {
        a: {
          $type: 'date',
        },
      },
      '"$type" at a expects a type or a list of types: string, number',
    ],
    [
      '$type an empty list',
      {
        a: {
          $type: [],
        },
      },
      '"$type" at a expects a type',
    ],
    [
      'operators mixed with fields',
      {
        a: {
          $gt: 1,
          b: 2,
        },
      },
      'the pattern at a mixes operators ($gt) and fields (b)',
    ],
    [
      '$or not a list',
      {
        $or: {
          a: 1,
        },
      },
      '"$or" at the top expects a list of patterns, got object',
    ],
    [
      'a cycle through an object',
      cyclic,
      'the pattern at self holds itself',
    ],
    [
      'a cycle through a list',
      cyclicList,
      'the pattern at the top holds itself',
    ],
    [
      'a function',
      {
        a: () => true,
      },
      'a function is not a pattern (at a): a check of its own is an operator — TMatchOperator',
    ],
  ])('%s', (
    _, pattern, message,
  ) => {
    expect(() => normalizeMatch(pattern as TMatch)).toThrow(message);
  });

  test('the message starts with where it was called', () => {
    expect(() => normalizeMatch({
      a: {
        $inn: 1,
      },
    })).toThrow(/^\[fundamentool\/match\] normalizeMatch: unknown operator/);
  });
});
