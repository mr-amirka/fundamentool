import {
  editDistance,
} from '../src';

describe('editDistance', () => {
  test.each([
    [
      '',
      '',
      0,
    ],
    [
      '',
      'abc',
      3,
    ],
    [
      'abc',
      '',
      3,
    ],
    [
      'abc',
      'abc',
      0,
    ],
    [
      'kitten',
      'sitting',
      3,
    ],
    [
      'onbording',
      'onboarding',
      1,
    ],
    [
      'flaw',
      'lawn',
      2,
    ],
    [
      'Case',
      'case',
      1,
    ],
  ])('%j → %j: %i', (
    a, b, expected,
  ) => {
    expect(editDistance(a, b)).toBe(expected);
    expect(editDistance(b, a)).toBe(expected);
  });

  test.each([
    [
      'kitten',
      'sitting',
      2,
      3,
    ],
    [
      'kitten',
      'sitting',
      3,
      3,
    ],
    [
      'a',
      'abcdef',
      2,
      3,
    ],
    [
      'abcdef',
      'uvwxyz',
      1,
      2,
    ],
    [
      'onbording',
      'onboarding',
      2,
      1,
    ],
  ])('%j → %j within %i: %i', (
    a, b, limit, expected,
  ) => {
    expect(editDistance(
      a, b, limit,
    )).toBe(expected);
  });
});
