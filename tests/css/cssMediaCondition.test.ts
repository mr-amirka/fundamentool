import {
  cssMediaCondition,
} from '../../src/css';

describe('cssMediaCondition', () => {
  test.each([
    [
      'width',
      '>=',
      '480px',
      'range',
      '(width >= 480px)',
    ],
    [
      'width',
      '<',
      '480px',
      'range',
      '(width < 480px)',
    ],
    [
      'width',
      '>=',
      '48rem',
      'classic',
      '(min-width: 48rem)',
    ],
    [
      'width',
      '<=',
      '768px',
      'classic',
      '(max-width: 768px)',
    ],
    [
      'width',
      '<',
      '480px',
      'classic',
      '(max-width: 479.98px)',
    ],
    [
      'width',
      '<',
      '48rem',
      'classic',
      '(max-width: 47.99875rem)',
    ],
    [
      'height',
      '>',
      '30em',
      'classic',
      '(min-height: 30.00125em)',
    ],
    [
      'width',
      '>',
      '1024px',
      'classic',
      '(min-width: 1024.02px)',
    ],
    [
      'width',
      '<',
      'calc(1px + 2px)',
      'classic',
      '(width < calc(1px + 2px))',
    ],
  ] as const)('%s %s %s %s → %s', (
    side, operator, length, syntax, expected,
  ) => {
    expect(cssMediaCondition(
      side, operator, length, syntax,
    )).toBe(expected);
  });
});
