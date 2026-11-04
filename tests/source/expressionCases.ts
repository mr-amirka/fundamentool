/**
 * The strings an expression can be — one table for the text reader and the parser: the two must agree on every case.
 * Each case is an expression and the strings it gives, in order.
 */
export const EXPRESSION_CASES: Array<[expression: string, strings: string[]]> = [
  [
    '\'p10\'',
    ['p10'],
  ],
  [
    '"p10 w5"',
    ['p10 w5'],
  ],
  [
    'on ? \'a\' : \'b\'',
    [
      'a',
      'b',
    ],
  ],
  [
    'v === \'splash\' ? \'bg1 cF\' : \'fx1\'',
    [
      'bg1 cF',
      'fx1',
    ],
  ],
  [
    'a ? (b ? \'x\' : \'y\') : \'z\'',
    [
      'x',
      'y',
      'z',
    ],
  ],
  [
    'a ? b ? \'x\' : \'y\' : \'z\'',
    [
      'x',
      'y',
      'z',
    ],
  ],
  [
    'on && \'a\'',
    ['a'],
  ],
  [
    '\'cond\' && \'a\'',
    ['a'],
  ],
  [
    'x || \'b\'',
    ['b'],
  ],
  [
    '\'a\' || \'b\'',
    [
      'a',
      'b',
    ],
  ],
  [
    'x ?? \'b\'',
    ['b'],
  ],
  [
    '\'a\' ?? \'b\'',
    [
      'a',
      'b',
    ],
  ],
  [
    'on && \'a\' || \'b\'',
    [
      'a',
      'b',
    ],
  ],
  [
    '(\'a\')',
    ['a'],
  ],
  [
    '(on && \'a\')',
    ['a'],
  ],
  [
    '`p10 w5`',
    ['p10 w5'],
  ],
  [
    '`p10 ${on ? \'cF\' : \'c0\'} w5`',
    [
      'p10 ',
      'cF',
      'c0',
      ' w5',
    ],
  ],
  [
    '`a ${x} b`',
    [
      'a ',
      ' b',
    ],
  ],
  [
    '\'a\' + \'b\'',
    [],
  ],
  [
    '\'a\' === b',
    [],
  ],
  [
    '\'a b\'.trim()',
    [],
  ],
  [
    'fn(\'a\')',
    [],
  ],
  [
    'obj.cls',
    [],
  ],
  [
    '!\'a\'',
    [],
  ],
  [
    'x',
    [],
  ],
  [
    '10',
    [],
  ],
  [
    'on ? \'a\' : x',
    ['a'],
  ],
  [
    'on ? fn(\'a\') : \'b\'',
    ['b'],
  ],
  [
    'a?.b ?? \'c\'',
    ['c'],
  ],
  [
    'value! || \'c\'',
    ['c'],
  ],
  [
    'arr[0] || \'c\'',
    ['c'],
  ],
  [
    'a < b ? \'x\' : \'y\'',
    [
      'x',
      'y',
    ],
  ],
];
