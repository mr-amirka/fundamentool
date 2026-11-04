import {
  matchesName,
  namePatternSource,
} from '../../src/source';
import {
  isIdentChar,
  isSpaceChar,
} from '../../src/source/names';

describe('matchesName', () => {
  test.each([
    [
      'className',
      ['className'],
      true,
    ],
    [
      'fillClassName',
      [
        'className',
        '*ClassName',
      ],
      true,
    ],
    [
      'ClassName',
      ['*ClassName'],
      false,
    ],
    [
      'classname',
      ['*ClassName'],
      false,
    ],
    [
      'fillclassname',
      ['*ClassName'],
      false,
    ],
    [
      'lassName',
      ['*ClassName'],
      false,
    ],
    [
      'thClass',
      [
        'mne',
        '*Class',
      ],
      true,
    ],
    [
      'mne',
      [
        'mne',
        '*Class',
      ],
      true,
    ],
    [
      'mne2',
      ['mne'],
      false,
    ],
    [
      'x',
      [],
      false,
    ],
    [
      '',
      ['*a'],
      false,
    ],
    [
      'ba',
      ['*a'],
      true,
    ],
  ])('%j in %j → %j', (
    name, patterns, expected,
  ) => {
    expect(matchesName(name, patterns)).toBe(expected);
  });
});

describe('namePatternSource', () => {
  test('an exact name, escaped', () => {
    expect(namePatternSource('className')).toBe('className');
    expect(namePatternSource('a.b')).toBe('a\\.b');
  });

  test('a pattern — any name with the ending', () => {
    expect(namePatternSource('*ClassName')).toBe('[\\w$-]+ClassName');
    const re = new RegExp('^' + namePatternSource('*ClassName') + '$');
    expect(re.test('fillClassName')).toBe(true);
    expect(re.test('data-ClassName')).toBe(true);
    expect(re.test('ClassName')).toBe(false);
  });
});

describe('the characters', () => {
  test.each([
    [
      'a',
      true,
    ],
    [
      'Z',
      true,
    ],
    [
      '0',
      true,
    ],
    [
      '_',
      true,
    ],
    [
      '$',
      true,
    ],
    [
      '-',
      false,
    ],
    [
      '.',
      false,
    ],
    [
      ' ',
      false,
    ],
  ])('isIdentChar(%j) → %j', (ch, expected) => {
    expect(isIdentChar(ch)).toBe(expected);
  });

  test('past the end is no character', () => {
    expect(isIdentChar(''[0])).toBe(false);
    expect(isSpaceChar(''[0])).toBe(false);
  });

  test.each([
    [
      ' ',
      true,
    ],
    [
      '\n',
      true,
    ],
    [
      '\t',
      true,
    ],
    [
      '\r',
      true,
    ],
    [
      'a',
      false,
    ],
  ])('isSpaceChar(%j) → %j', (ch, expected) => {
    expect(isSpaceChar(ch)).toBe(expected);
  });
});
