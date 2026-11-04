import {
  MATH_RULES_OPTIONS,
  mathRules,
} from '../../src/css';

describe('mathRules', () => {
  test('frozen rules with a copy of the units; no minus by default', () => {
    const units = [
      'px',
      '%',
    ];
    const rules = mathRules({
      name: 'w',
      unit: 'px',
      units,
    });
    units.push('em');
    expect(rules).toEqual({
      name: 'w',
      unit: 'px',
      units: [
        'px',
        '%',
      ],
      negative: false,
    });
    expect(Object.isFrozen(rules)).toBe(true);
    expect(Object.isFrozen(rules.units)).toBe(true);
    expect(mathRules({
      name: 'm',
      unit: '',
      units: [],
      negative: true,
    }).negative).toBe(true);
  });

  test.each([
    [
      {
        name: 'w',
        unit: 'em',
        units: ['px'],
      },
      '[fundamentool/css] mathRules: "unit" expects one of "units", got "em"',
    ],
    [
      {
        name: 'w',
        unit: 'px',
        units: ['px'],
        negative: 'yes',
      },
      '[fundamentool/css] mathRules: "negative" expects true or false, got string "yes"',
    ],
    [
      {
        name: 'w',
        unit: 'px',
        units: ['px'],
        unts: [],
      },
      'unknown option "unts"',
    ],
  ])('development: %j', (options, message) => {
    expect(() => mathRules(options as never)).toThrow(message);
  });

  test('production: no checks', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(mathRules({
        name: 'w',
        unit: 'em',
        units: ['px'],
      }).unit).toBe('em');
    } finally {
      process.env.NODE_ENV = env;
    }
  });

  test('the keys are listed by the schema', () => {
    expect(MATH_RULES_OPTIONS().keys).toEqual([
      'name',
      'unit',
      'units',
      'negative',
    ]);
  });
});
