import fc from 'fast-check';
import {
  alignmentDistance,
  editDistance,
} from '../src';

describe('alignmentDistance', () => {
  test.each([
    [
      '',
      '',
      Infinity,
      0,
    ],
    [
      '',
      'abc',
      Infinity,
      3,
    ],
    [
      'abc',
      '',
      Infinity,
      3,
    ],
    [
      'abc',
      'abc',
      Infinity,
      0,
    ],
    [
      'kitten',
      'sitting',
      Infinity,
      3,
    ],
    [
      'statsu',
      'status',
      Infinity,
      1,
    ],
    [
      'statsu',
      'state',
      Infinity,
      2,
    ],
    [
      'hedaing',
      'heading',
      Infinity,
      1,
    ],
    [
      'ab',
      'ba',
      Infinity,
      1,
    ],
    [
      'ca',
      'abc',
      Infinity,
      3,
    ],
    [
      'abcdef',
      'badcfe',
      Infinity,
      3,
    ],
    [
      'kitten',
      'sitting',
      2,
      3,
    ],
    [
      'abc',
      'abcdef',
      1,
      2,
    ],
    [
      'abcdef',
      'ghijkl',
      2,
      3,
    ],
    [
      'statsu',
      'status',
      1,
      1,
    ],
  ])('%s → %s (limit %s): %s', (
    a, b, limit, expected,
  ) => {
    expect(alignmentDistance(
      a, b, limit,
    )).toBe(expected);
  });

  test('never more than editDistance, never less than its half; symmetric; limit agrees with no limit', () => {
    fc.assert(fc.property(
      fc.string({
        maxLength: 8,
      }), fc.string({
        maxLength: 8,
      }), fc.integer({
        min: 0,
        max: 4,
      }),
      (
        a, b, limit,
      ) => {
        const distance = alignmentDistance(a, b);
        const levenshtein = editDistance(a, b);
        expect(distance).toBeLessThanOrEqual(levenshtein);
        expect(2 * distance).toBeGreaterThanOrEqual(levenshtein);
        expect(alignmentDistance(b, a)).toBe(distance);
        expect(alignmentDistance(
          a, b, limit,
        )).toBe(distance > limit ? limit + 1 : distance);
      },
    ));
  });
});
