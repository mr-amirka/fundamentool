import {
  MATCH_TYPES,
  STANDARD_OPERATORS,
  matchTypeOf,
} from '../../src/match';

describe('STANDARD_OPERATORS', () => {
  test('the registry: each with a test or a negation', () => {
    expect(Object.keys(STANDARD_OPERATORS)).toEqual([
      '$eq',
      '$ne',
      '$in',
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$has',
      '$regex',
      '$exists',
      '$type',
    ]);
    for (const name of Object.keys(STANDARD_OPERATORS)) {
      const operator = STANDARD_OPERATORS[name];
      expect(Boolean(operator.test || operator.negationOf)).toBe(true);
    }
  });

  test('$ne and $exists: false are negations, so a dialect needs no handler of their own', () => {
    expect(STANDARD_OPERATORS.$ne.negationOf?.(1)).toEqual([
      '$eq',
      1,
    ]);
    expect(STANDARD_OPERATORS.$exists.negationOf?.(false)).toEqual([
      '$exists',
      true,
    ]);
    expect(STANDARD_OPERATORS.$exists.negationOf?.(true)).toBeUndefined();
  });

  test('$regex prepares a RegExp without g and y', () => {
    const regexp = STANDARD_OPERATORS.$regex.prepare?.(/a/giy) as RegExp;
    expect(regexp.flags).toBe('i');
    expect(STANDARD_OPERATORS.$regex.check?.(/a/)).toBeUndefined();
    expect(STANDARD_OPERATORS.$regex.check?.([
      'a',
      'i',
    ])).toBeUndefined();
  });
});

describe('matchTypeOf', () => {
  test.each<[unknown, string]>([
    [
      'x',
      'string',
    ],
    [
      1,
      'number',
    ],
    [
      true,
      'boolean',
    ],
    [
      1n,
      'bigint',
    ],
    [
      undefined,
      'undefined',
    ],
    [
      null,
      'null',
    ],
    [
      [1],
      'array',
    ],
    [
      {},
      'object',
    ],
    [
      new Date(),
      'object',
    ],
    [
      () => 1,
      'function',
    ],
    [
      Symbol('s'),
      'symbol',
    ],
  ])('%p is %s', (value, type) => {
    expect(matchTypeOf(value)).toBe(type);
    expect(MATCH_TYPES).toContain(type);
  });
});

describe('fundamentool/match — the entry', () => {
  test('isMatch is the one of the root entry, not a copy', async () => {
    const root = await import('../../src/is/isMatch');
    const match = await import('../../src/match');
    expect(match.isMatch).toBe(root.isMatch);
  });
});
