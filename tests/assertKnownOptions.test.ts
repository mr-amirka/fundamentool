import {
  assertKnownOptions,
  describeValue,
} from '../src/index';

const WHERE = '[fundamentool test] factory';

describe('assertKnownOptions', () => {
  it('accepts known keys and undefined values of unknown keys', () => {
    expect(() => assertKnownOptions(
      WHERE, {
        a: 1,
        b: 2, 
      }, ['a', 'b'],
    )).not.toThrow();
    expect(() => assertKnownOptions(
      WHERE, {
        a: 1,
        extra: undefined, 
      }, ['a'],
    )).not.toThrow();
  });

  it.each([
    [
      'a typo (substitution)',
      'manifesturl',
      'Did you mean "manifestUrl"?',
    ],
    [
      'a missing letter',
      'manifstUrl',
      'Did you mean "manifestUrl"?',
    ],
    [
      'an extra letter',
      'fetchJsonn',
      'Did you mean "fetchJson"?',
    ],
  ])('%s — "did you mean"', (
    _name, key, message,
  ) => {
    expect(() => assertKnownOptions(
      WHERE, {
        [key]: 1, 
      }, ['manifestUrl', 'fetchJson'],
    ))
      .toThrow(`${WHERE}: unknown option "${key}". ${message}`);
  });

  it('a far-off key — the list of accepted keys', () => {
    expect(() => assertKnownOptions(
      WHERE, {
        cdn: 1, 
      }, ['manifestUrl', 'fetchJson'],
    ))
      .toThrow(`${WHERE}: unknown option "cdn". Known options: manifestUrl, fetchJson`);
  });

  it('a key of very different length is not compared letter by letter', () => {
    expect(() => assertKnownOptions(
      WHERE, {
        x: 1, 
      }, ['averyveryverylongoption'],
    ))
      .toThrow('Known options: averyveryverylongoption');
  });

  it('picks the closest of several candidates', () => {
    expect(() => assertKnownOptions(
      WHERE, {
        wieght: 1, 
      }, ['width', 'weight'],
    ))
      .toThrow('Did you mean "weight"?');
  });
});

describe('describeValue', () => {
  it.each([
    [null, 'null'],
    ['p10', 'string "p10"'],
    [() => 1, 'function'],
    [[1], 'array'],
    [{}, 'object'],
    [42, 'number 42'],
    [undefined, 'undefined undefined'],
    [true, 'boolean true'],
  ])('%p → %s', (value, expected) => {
    expect(describeValue(value)).toBe(expected);
  });
});
