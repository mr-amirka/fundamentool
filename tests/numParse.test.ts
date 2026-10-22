import {
  numParse,
} from '../src/numParse';

describe('numParse', () => {
  test('parses number string', () => {
    expect(numParse('42')).toBe(42);
    expect(numParse('-3.14')).toBe(-3.14);
  });

  test('returns null for null/undefined', () => {
    expect(numParse(null)).toBeNull();
    expect(numParse(undefined)).toBeNull();
  });

  test('strips whitespace', () => {
    expect(numParse('  10  ')).toBe(10);
  });

  test.each([
    [
      0,
      0,
    ],
    [
      -0,
      0,
    ],
    [
      '0',
      0,
    ],
    [
      '.5',
      0.5,
    ],
    [
      '-.5',
      -0.5,
    ],
    [
      '5.',
      5,
    ],
    [
      '1 000.5',
      1000.5,
    ],
    [
      '1.000.5',
      1000.5,
    ],
    [
      '12px',
      12,
    ],
    [
      '.',
      null,
    ],
    [
      '',
      null,
    ],
    [
      'abc',
      null,
    ],
    [
      true,
      null,
    ],
    [
      false,
      null,
    ],
  ])('numParse(%p) → %p', (input, expected) => {
    expect(numParse(input)).toBe(expected);
  });

  test('base: the sign, the whole part, the fraction', () => {
    expect(numParse.base('-1 000.25')).toEqual([
      '-',
      '1000',
      '25',
    ]);
    expect(numParse.base('.')).toBeNull();
  });
});
