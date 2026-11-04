import {
  CSS_VALUES_OPTIONS,
  cssValuesProvider,
  mathRules,
} from '../../src/css';
import type {
  TCssValuesOptions,
  TMathRules,
} from '../../src/css';

/** A spelling for JS: groups and arguments in parentheses, functions as CSS writes them. */
const JS: TCssValuesOptions = {
  group: [
    '(',
    ')',
  ],
  variable: '$',
  env: '$$',
  nameEnd: ';',
  functions: {
    min: 'min',
    max: 'max',
    clamp: 'clamp',
  },
  gradient: {
    join: '-',
    stop: 'p',
    angle: '_g',
    radial: '_r',
    repeat: '_rpt',
    space: '_',
  },
};

/** Another spelling, to check that two providers don't mix: braces, capitalized functions, env as `@`. */
const BRACES: TCssValuesOptions = {
  ...JS,
  group: [
    '{',
    '}',
  ],
  env: '@',
  functions: {
    Min: 'min',
    Clamp: 'clamp',
  },
};

const width = mathRules({
  name: 'w',
  unit: 'px',
  units: [
    'px',
    'rem',
    'vw',
    '%',
  ],
});
const margin = mathRules({
  name: 'm',
  unit: 'px',
  units: [
    'px',
    '%',
  ],
  negative: true,
});
const lineHeight = mathRules({
  name: 'lh',
  unit: '',
  units: [],
  negative: true,
});
const border = mathRules({
  name: 'b',
  unit: 'px',
  units: ['px'],
});
const indent = mathRules({
  name: 'ti',
  unit: 'px',
  units: 'px em rem ex ch vw vh vmin vmax %'.split(' '),
});

const css = cssValuesProvider(JS);

/** The message of the error `math` throws. */
function errorOf(
  expr: string, rules: TMathRules = width, values = css,
): string {
  try {
    values.math(expr, rules);
  } catch (ex) {
    expect(ex).toBeInstanceOf(TypeError);
    return (ex as Error).message;
  }
  throw new Error('"' + expr + '" was read');
}

describe('cssValuesProvider — math', () => {
  test.each([
    [
      '10',
      '10px',
    ],
    [
      '1.5',
      '1.5px',
    ],
    [
      '.5',
      '.5px',
    ],
    [
      '0',
      '0',
    ],
    [
      '0px',
      '0',
    ],
    [
      '10rem',
      '10rem',
    ],
    [
      '33.333%',
      '33.33%',
    ],
    [
      '100%-2rem+10',
      'calc(100% - 2rem + 10px)',
    ],
    [
      '100%-2*$gap',
      'calc(100% - 2 * var(--gap))',
    ],
    [
      '$gap*2',
      'calc(var(--gap) * 2)',
    ],
    [
      '.5*$gap',
      'calc(.5 * var(--gap))',
    ],
    [
      '10*2',
      'calc(10px * 2)',
    ],
    [
      '10*2/4',
      'calc(10px * 2 / 4)',
    ],
    [
      '1/3',
      '33.33%',
    ],
    [
      '1/.5',
      '200%',
    ],
    [
      '2*$a+1',
      'calc(2 * var(--a) + 1px)',
    ],
    [
      '1/3+10',
      'calc(33.33% + 10px)',
    ],
    [
      '(1+2)',
      'calc(1px + 2px)',
    ],
    [
      '(10)',
      '10px',
    ],
    [
      '(1+2)*3',
      'calc((1px + 2px) * 3)',
    ],
    [
      'min(100%,50rem)',
      'min(100%, 50rem)',
    ],
    [
      'max(1,2,3)',
      'max(1px, 2px, 3px)',
    ],
    [
      'clamp(1,2vw+1,3)',
      'clamp(1px, 2vw + 1px, 3px)',
    ],
    [
      'min(1,2)*2',
      'calc(min(1px, 2px) * 2)',
    ],
    [
      '$a',
      'var(--a)',
    ],
    [
      '$a(10)',
      'var(--a, 10px)',
    ],
    [
      '$a(10+5)',
      'var(--a, calc(10px + 5px))',
    ],
    [
      '$a;-2',
      'calc(var(--a) - 2px)',
    ],
    [
      '$$x',
      'env(x)',
    ],
    [
      '16+$$safe-area-inset-bottom(0)',
      'calc(16px + env(safe-area-inset-bottom, 0px))',
    ],
    [
      '$имя',
      'var(--имя)',
    ],
  ])('%s → %s', (expr, expected) => {
    expect(css.math(expr, width)).toBe(expected);
  });

  test.each([
    [
      '-10',
      margin,
      '-10px',
    ],
    [
      '-.5',
      margin,
      '-.5px',
    ],
    [
      '-$a',
      margin,
      'calc(var(--a) * -1)',
    ],
    [
      '-(1+2)',
      margin,
      'calc((1px + 2px) * -1)',
    ],
    [
      '1.5',
      lineHeight,
      '1.5',
    ],
    [
      '-0.5',
      lineHeight,
      '-.5',
    ],
    [
      '1.125*2',
      lineHeight,
      'calc(1.125 * 2)',
    ],
  ])('%s under its rules → %s', (
    expr, rules, expected,
  ) => {
    expect(css.math(expr, rules)).toBe(expected);
  });

  test('the members use no `this`', () => {
    const {
      math, bare,
    } = css;
    expect(math('1+2', width)).toBe('calc(1px + 2px)');
    expect(bare()).toBe(1);
  });

  test.each([
    [
      '10',
      0,
    ],
    [
      '1+2',
      1,
    ],
    [
      '$a*2',
      1,
    ],
    [
      '-10',
      0,
    ],
    [
      '1/3',
      0,
    ],
    [
      '(1+2)',
      0,
    ],
    [
      'min(1+2,3)',
      0,
    ],
    [
      '$a(1+2)',
      0,
    ],
  ])('bare after %s → %s', (expr, expected) => {
    css.math(expr, margin);
    expect(css.bare()).toBe(expected);
  });
});

describe('cssValuesProvider — math errors', () => {
  const prefix = '[fundamentool/css] Value ';

  test.each([
    [
      '',
      width,
      '"" is invalid for "w": a value is expected',
    ],
    [
      '-10',
      width,
      '"-10" is invalid: negative value is not allowed for this property',
    ],
    [
      '10em',
      width,
      '"10em" is invalid for "w": unit "em" doesn\'t fit: the units are px, rem, vw, %',
    ],
    [
      '0em',
      width,
      '"0em" is invalid for "w": unit "em" doesn\'t fit: the units are px, rem, vw, %',
    ],
    [
      '10px',
      lineHeight,
      '"10px" is invalid for "lh": unit "px" doesn\'t fit: the value is a plain number, as "1.5"',
    ],
    [
      '10qq',
      indent,
      '"10qq" is invalid for "ti": unit "qq" doesn\'t fit, as "10px"',
    ],
    [
      '10%',
      border,
      '"10%" is invalid: this property takes a length, percent is not allowed',
    ],
    [
      '1/3',
      border,
      '"1/3" is invalid: this property takes a length, percent is not allowed',
    ],
    [
      '1..2',
      width,
      '"1..2" is invalid for "w": "1..2" is not a number',
    ],
    [
      '.',
      width,
      '"." is invalid for "w": "." is not a number',
    ],
    [
      '1/3px',
      width,
      '"1/3px" is invalid for "w": a fraction is a number over a number: "1/3" — the unit goes after the fraction is'
        + ' turned into a percent, so it isn\'t written',
    ],
    [
      '1/0',
      width,
      '"1/0" is invalid for "w": a fraction can\'t have a zero total: "1/0"',
    ],
    [
      '$',
      width,
      '"$" is invalid for "w": a variable needs a name after "$": "$gap", "$$safe-area-inset-top"',
    ],
    [
      '$$',
      width,
      '"$$" is invalid for "w": a variable needs a name after "$$": "$gap", "$$safe-area-inset-top"',
    ],
    [
      '10+',
      width,
      '"10+" is invalid for "w": "+" needs a term after it',
    ],
    [
      '10)',
      width,
      '"10)" is invalid for "w": ")" after "10" is not expected',
    ],
    [
      '#1',
      width,
      '"#1" is invalid for "w": "#" is not expected: a value starts with a number ("10"), a variable ("$x"), a function'
        + ' ("min(…)") or a group ("(…)")',
    ],
    [
      'bF00',
      width,
      '"bF00" is invalid for "w": "b" is not expected: a value starts with a number ("10"), a variable ("$x"), a'
        + ' function ("min(…)") or a group ("(…)")',
    ],
    [
      'calc(1+2)',
      width,
      '"calc(1+2)" is invalid for "w": a sum is written without "calc": "100%-2rem", a group in parentheses —'
        + ' "(100%-2rem)/3"',
    ],
    [
      'foo(1)',
      width,
      '"foo(1)" is invalid for "w": unknown function "foo". Functions: min, max, clamp',
    ],
    [
      'min',
      width,
      '"min" is invalid for "w": the arguments of "min" are written in parentheses: "min(100%,50rem)"',
    ],
    [
      'min(1)',
      width,
      '"min(1)" is invalid for "w": "min" takes at least 2 arguments, got 1',
    ],
    [
      'clamp(1,2)',
      width,
      '"clamp(1,2)" is invalid for "w": "clamp" takes 3 arguments, got 2',
    ],
    [
      '(1+2',
      width,
      '"(1+2" is invalid for "w": "(" is not closed',
    ],
    [
      '(1+2#',
      width,
      '"(1+2#" is invalid for "w": "#" after "(1+2" is not expected',
    ],
    [
      '$a,10',
      width,
      '"$a,10" is invalid for "w": a fallback is written in parentheses: "$a(10)"',
    ],
    [
      '--a',
      margin,
      '"--a" is invalid for "m": "-" after "-" is not expected',
    ],
  ])('%s', (
    expr, rules, message,
  ) => {
    expect(errorOf(expr, rules)).toBe(prefix + message);
  });

  test('fail throws the caller\'s error', () => {
    class OwnError extends Error {}
    const own = cssValuesProvider({
      ...JS,
      fail: (message) => {
        throw new OwnError(message);
      },
    });
    expect(() => own.math('1/0', width)).toThrow(OwnError);
    expect(() => own.math('1/0', width)).toThrow('Value "1/0" is invalid for "w": a fraction can\'t have a zero total');
  });

  test('a fail that returns still stops the reader', () => {
    const seen: string[] = [];
    const own = cssValuesProvider({
      ...JS,
      fail: ((message: string) => {
        seen.push(message);
      }) as (message: string) => never,
    });
    expect(errorOf(
      '1/0', width, own,
    )).toBe(prefix + '"1/0" is invalid for "w": a fraction can\'t have a zero total: "1/0"');
    expect(seen).toHaveLength(1);
  });
});

describe('cssValuesProvider — legacy', () => {
  const seen: string[] = [];
  const old = cssValuesProvider({
    ...JS,
    legacy: (expr) => {
      seen.push(expr);
      if (expr.indexOf('!') < 0) {
        throw new TypeError('old: ' + expr);
      }
    },
  });

  beforeEach(() => {
    seen.length = 0;
  });

  test.each([
    '--a',
    '10+--a',
    '(--a)',
  ])('a term starting with "--" goes to the hook: %s', (expr) => {
    expect(() => old.math(expr, margin)).toThrow('old: ' + (expr === '(--a)' ? '--a' : expr));
  });

  test('a hook that returns lets the reader go on', () => {
    expect(errorOf(
      '--a!', margin, old,
    )).toBe('[fundamentool/css] Value "--a!" is invalid for "m": "-" after "-" is not'
      + ' expected');
    expect(errorOf(
      '1+--a!', margin, old,
    )).toBe('[fundamentool/css] Value "1+--a!" is invalid for "m": "-" after "1+"'
      + ' is not expected');
    expect(seen).toEqual([
      '--a!',
      '1+--a!',
    ]);
  });

  test('variable and gradient call it too', () => {
    expect(() => old.variable('--a')).toThrow('old: --a');
    expect(() => old.gradient('--a;--b')).toThrow('old: --a;--b');
    expect(old.variable('--a!')).toBeUndefined();
    expect(old.gradient('F00--!')).toEqual(['linear-gradient(180deg,#f00 0%,! 100%)']);
  });

  test('without a hook "--" is no variable', () => {
    expect(css.variable('--a')).toBeUndefined();
    expect(css.gradient('F00--00F')).toEqual(['linear-gradient(180deg,#f00 0%,#00f 100%)']);
  });
});

describe('cssValuesProvider — variable', () => {
  test.each([
    [
      '$mono',
      'var(--mono)',
    ],
    [
      '$mono;',
      'var(--mono)',
    ],
    [
      '$$x',
      'env(x)',
    ],
    [
      '$mono(serif)',
      'var(--mono, serif)',
    ],
    [
      '$a($b)',
      'var(--a, var(--b))',
    ],
    [
      '$a;(10px)',
      'var(--a, 10px)',
    ],
  ])('%s → %s', (s, expected) => {
    expect(css.variable(s)).toBe(expected);
  });

  test.each([
    'x',
    '',
    '$',
    '$a b',
    '$a(x',
    '$a x)',
  ])('not a variable whole: %j', (s) => {
    expect(css.variable(s)).toBeUndefined();
  });

  test('the fallback reader gets only what is not a variable, at any depth', () => {
    const seen: string[] = [];
    expect(css.variable('$a($b(x))', (raw) => (seen.push(raw), raw.toUpperCase()))).toBe('var(--a, var(--b, X))');
    expect(seen).toEqual(['x']);
  });
});

describe('cssValuesProvider — color', () => {
  test.each([
    [
      '$ink',
      undefined,
      ['var(--ink)'],
    ],
    [
      '$ink(F00)',
      undefined,
      ['var(--ink, #f00)'],
    ],
    [
      '$a($b(F00.5))',
      undefined,
      ['var(--a, var(--b, rgba(255,0,0,.5)))'],
    ],
    [
      '$ink(red)',
      undefined,
      ['var(--ink, red)'],
    ],
    [
      'F00',
      undefined,
      ['#f00'],
    ],
    [
      'F00.5',
      true,
      [
        '#f00',
        'rgba(255,0,0,.5)',
      ],
    ],
  ])('%s (alt: %s)', (
    v, alt, expected,
  ) => {
    expect(css.color(v, alt)).toEqual(expected);
  });
});

describe('cssValuesProvider — gradient', () => {
  test.each([
    [
      'F00-00F',
      ['linear-gradient(180deg,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-0F0-00F',
      ['linear-gradient(180deg,#f00 0%,#0f0 50%,#00f 100%)'],
    ],
    [
      'F00-00F_g90',
      ['linear-gradient(270deg,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-00F_g-270',
      ['linear-gradient(270deg,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-00F_r',
      ['radial-gradient(circle,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-00F_r_ellipse_closestSide',
      ['radial-gradient(ellipse closest-side,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-00F_rEllipse_at_top',
      ['radial-gradient(ellipse at top,#f00 0%,#00f 100%)'],
    ],
    [
      'F00-00F_rpt',
      ['repeating-linear-gradient(180deg,#f00 0%,#00f 100%)'],
    ],
    [
      'F00p10-00Fp40px',
      ['linear-gradient(180deg,#f00 10%,#00f 40px)'],
    ],
    [
      '$a$b',
      ['linear-gradient(180deg,var(--a) 0%,var(--b) 100%)'],
    ],
    [
      '$a;-F00p50',
      ['linear-gradient(180deg,var(--a) 0%,#f00 50%)'],
    ],
    [
      '$a;p40-$b(F00)p60px',
      ['linear-gradient(180deg,var(--a) 40%,var(--b, #f00) 60px)'],
    ],
    [
      '$$a;-F00',
      ['linear-gradient(180deg,env(a) 0%,#f00 100%)'],
    ],
    [
      'F00',
      ['#f00'],
    ],
    [
      '',
      [],
    ],
  ])('%s', (input, expected) => {
    expect(css.gradient(input)).toEqual(expected);
  });

  test('alt: the colour without alpha first, then the gradient with it', () => {
    expect(css.gradient('F00.5-00F', true)).toEqual([
      '#f00',
      'rgba(255,0,0,.5)',
      'linear-gradient(180deg,#f00 0%,#00f 100%)',
      'linear-gradient(180deg,rgba(255,0,0,.5) 0%,#00f 100%)',
    ]);
    expect(css.gradient('F00-00F', true)).toEqual([
      '#f00',
      'linear-gradient(180deg,#f00 0%,#00f 100%)',
    ]);
  });
});

describe('cssValuesProvider — two spellings', () => {
  const braces = cssValuesProvider(BRACES);

  test('each provider reads its own spelling, in any order', () => {
    expect(braces.math('Min{1,@x{2}}', width)).toBe('min(1px, env(x, 2px))');
    expect(css.math('min(1,$$x(2))', width)).toBe('min(1px, env(x, 2px))');
    expect(braces.variable('$a{10px}')).toBe('var(--a, 10px)');
    expect(css.variable('$a(10px)')).toBe('var(--a, 10px)');
    expect(braces.color('@ink{F00}')).toEqual(['env(ink, #f00)']);
    expect(braces.gradient('@a;-$b{F00}')).toEqual(['linear-gradient(180deg,env(a) 0%,var(--b, #f00) 100%)']);
    expect(css.math('$$x', width)).toBe('env(x)');
  });

  test('a fallback reader that calls another provider', () => {
    expect(css.variable('$a(x)', (raw) => braces.variable('$' + raw + '{1px}') as string)).toBe('var(--a, var(--x, 1px))');
    expect(css.variable('$b')).toBe('var(--b)');
  });

  test('the messages say the spelling', () => {
    expect(errorOf(
      'Min 1', width, braces,
    )).toBe('[fundamentool/css] Value "Min 1" is invalid for "w": the arguments of'
      + ' "Min" are written in braces: "Min{100%,50rem}"');
    expect(errorOf(
      '#', width, braces,
    )).toBe('[fundamentool/css] Value "#" is invalid for "w": "#" is not expected: a'
      + ' value starts with a number ("10"), a variable ("$x"), a function ("Min{…}") or a group ("{…}")');
    expect(errorOf(
      'Max{1,2}', width, braces,
    )).toBe('[fundamentool/css] Value "Max{1,2}" is invalid for "w": unknown'
      + ' function "Max". Functions: Min, Clamp');
    expect(errorOf(
      '@', width, braces,
    )).toBe('[fundamentool/css] Value "@" is invalid for "w": a variable needs a name'
      + ' after "@": "$gap", "@safe-area-inset-top"');
  });

  test('a group of other characters, no functions', () => {
    const square = cssValuesProvider({
      ...JS,
      group: [
        '[',
        ']',
      ],
      functions: {},
    });
    const angle = cssValuesProvider({
      ...JS,
      group: [
        '<',
        '>',
      ],
    });
    expect(square.math('[1+2]*2', width)).toBe('calc((1px + 2px) * 2)');
    expect(errorOf(
      '#', width, square,
    )).toBe('[fundamentool/css] Value "#" is invalid for "w": "#" is not expected: a'
      + ' value starts with a number ("10"), a variable ("$x"), or a group ("[…]")');
    expect(errorOf(
      '$a,1', width, square,
    )).toBe('[fundamentool/css] Value "$a,1" is invalid for "w": a fallback is'
      + ' written in square brackets: "$a[1]"');
    expect(errorOf(
      'min 1', width, angle,
    )).toBe('[fundamentool/css] Value "min 1" is invalid for "w": the arguments of'
      + ' "min" are written in "<>": "min<100%,50rem>"');
  });
});

describe('cssValuesProvider — options (development)', () => {
  const where = '[fundamentool/css] cssValuesProvider: ';

  test.each([
    [
      'an unknown key',
      {
        ...JS,
        grup: 1,
      },
      'unknown option "grup"',
    ],
    [
      'a missing key',
      {
        ...JS,
        env: undefined,
      },
      '"env"',
    ],
    [
      'a group of two-character strings',
      {
        ...JS,
        group: [
          '((',
          ')',
        ],
      },
      'expects one character, got "(("',
    ],
    [
      'a letter as the variable',
      {
        ...JS,
        variable: 'v',
      },
      'expects a character that is not part of a name or of math, got "v"',
    ],
    [
      'an operator as the name end',
      {
        ...JS,
        nameEnd: '+',
      },
      'expects a character that is not part of a name or of math, got "+"',
    ],
    [
      'an empty env',
      {
        ...JS,
        env: '',
      },
      'expects a non-empty string, got an empty string',
    ],
    [
      'a function CSS has not',
      {
        ...JS,
        functions: {
          calc: 'calc',
        },
      },
      'calc',
    ],
    [
      'a function name of capitals',
      {
        ...JS,
        functions: {
          MIN: 'min',
        },
      },
      'expects names of a letter and then lowercase letters, as "min" or "Min", got "MIN"',
    ],
    [
      'a join of two characters',
      {
        ...JS,
        gradient: {
          ...JS.gradient,
          join: '--',
        },
      },
      'expects one character, got "--"',
    ],
    [
      'the group and the variable with one character',
      {
        ...JS,
        variable: '(',
      },
      '"group[0]" and "variable" are both "("',
    ],
    [
      'the env and the name end with one character',
      {
        ...JS,
        env: ';;',
      },
      '"nameEnd" and "env" are both ";"',
    ],
    [
      'the env the same as the variable',
      {
        ...JS,
        env: '$',
      },
      '"env" and "variable" are both "$"',
    ],
  ])('%s', (
    _name, options, message,
  ) => {
    expect(() => cssValuesProvider(options as never)).toThrow(where.slice(0, -2));
    expect(() => cssValuesProvider(options as never)).toThrow(message);
  });

  test('the keys are listed by the schema', () => {
    expect(CSS_VALUES_OPTIONS().keys).toEqual([
      'group',
      'variable',
      'env',
      'nameEnd',
      'functions',
      'gradient',
      'fail',
      'legacy',
    ]);
  });

  test('production: no checks', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => cssValuesProvider({
        ...JS,
        grup: 1,
      } as never)).not.toThrow();
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});
